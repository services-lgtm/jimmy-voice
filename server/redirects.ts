/**
 * server/redirects.ts
 * Old-URL rescue for the headless domain switch.
 *
 * Google Shopping, old bookmarks, and search-engine results point at the
 * BigCommerce product/category URLs (e.g. /portwest-uh440-hi-vis-jacket/).
 * Our new SPA doesn't have those routes, so they'd hit the NotFound page.
 * This builds a slug → destination map from the live catalog and lets the
 * server 301-redirect those URLs to the matching page on the new site.
 */
import { ENV } from "./_core/env";
import { isBigCommerceConfigured } from "./bigcommerce";

let productMap = new Map<string, number>(); // slug -> product id
let categoryMap = new Map<string, { id: number; name: string }>(); // slug -> category
let loadedAt = 0;
let loading: Promise<void> | null = null;
const REFRESH_MS = 15 * 60 * 1000;

// App routes that must never be treated as store slugs.
const APP_ROUTES = new Set([
  "/", "/shop", "/jimmy", "/cart", "/pallet-deals", "/calculators", "/advertise",
  "/account", "/voice",
]);

/** lowercase, ensure leading slash, drop trailing slash + query/hash. */
function normPath(p: string): string {
  let s = (p || "").split("?")[0].split("#")[0].toLowerCase();
  if (!s.startsWith("/")) s = "/" + s;
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s || "/";
}

async function bcGet(pathAndQuery: string): Promise<any | null> {
  try {
    const res = await fetch(
      `https://api.bigcommerce.com/stores/${ENV.bcStoreHash}/v3${pathAndQuery}`,
      { headers: { "X-Auth-Token": ENV.bcAccessToken, Accept: "application/json" } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function build(): Promise<void> {
  const products = new Map<string, number>();
  const categories = new Map<string, { id: number; name: string }>();

  // products (paginate)
  let page = 1;
  let totalPages = 1;
  do {
    const json = await bcGet(
      `/catalog/products?limit=250&page=${page}&include_fields=custom_url`,
    );
    if (!json) break;
    for (const p of json.data ?? []) {
      const url = p?.custom_url?.url as string | undefined;
      if (url) products.set(normPath(url), p.id);
    }
    totalPages = json.meta?.pagination?.total_pages ?? 1;
    page++;
  } while (page <= totalPages);

  // categories
  const cj = await bcGet(`/catalog/categories?limit=250`);
  for (const c of cj?.data ?? []) {
    const url = c?.custom_url?.url as string | undefined;
    if (url) categories.set(normPath(url), { id: c.id, name: c.name });
  }

  if (products.size) {
    productMap = products;
    categoryMap = categories;
    loadedAt = Date.now();
    console.log(`[Redirects] map built: ${products.size} products, ${categories.size} categories`);
  }
}

export function ensureRedirectMap(): void {
  if (!isBigCommerceConfigured()) return;
  if (loading || (productMap.size && Date.now() - loadedAt < REFRESH_MS)) return;
  loading = build()
    .catch((err) => console.error("[Redirects] build failed:", err))
    .finally(() => {
      loading = null;
    });
}

/**
 * Resolve an incoming path to a new-site destination, or null to fall through
 * to the SPA. Products → /product/{id}; categories → /shop?cat={id}.
 */
export function resolveRedirect(rawPath: string): string | null {
  const path = normPath(rawPath);
  if (APP_ROUTES.has(path) || path.startsWith("/product/")) return null;

  const pid = productMap.get(path);
  if (pid) return `/product/${pid}`;

  const cat = categoryMap.get(path);
  if (cat) return `/shop?cat=${cat.id}&name=${encodeURIComponent(cat.name)}`;

  return null;
}

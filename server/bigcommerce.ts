/**
 * server/bigcommerce.ts
 * Go Build Supply runs on BigCommerce. This talks to the BigCommerce
 * Catalog API (v3) to pull REAL products + live pricing.
 *
 * It works even while the storefront is "Coming Soon", because the Catalog
 * API uses a private API account token (not the public storefront).
 *
 * Setup (see .env): you need a Store API Account with "Products" read scope.
 *   BIGCOMMERCE_STORE_HASH   — the short code in your API path, e.g. "abc123"
 *   BIGCOMMERCE_ACCESS_TOKEN — the token from the API account
 *   BIGCOMMERCE_STORE_URL    — your storefront domain (for product links)
 */

import { ENV } from "./_core/env";
import type { ShopifyProduct } from "./shopify";

export function isBigCommerceConfigured(): boolean {
  return Boolean(ENV.bcStoreHash && ENV.bcAccessToken);
}

// Conversational filler to strip before searching — BigCommerce matches ALL
// keywords, so "how much for drywall tape" finds nothing; "drywall tape" works.
const STOP_WORDS = new Set([
  "how", "much", "many", "is", "are", "the", "a", "an", "of", "for", "to", "do",
  "does", "you", "your", "i", "we", "some", "any", "price", "prices", "cost",
  "costs", "what", "whats", "need", "needs", "want", "wants", "have", "has",
  "get", "got", "me", "my", "can", "could", "would", "please", "and", "with",
  "that", "this", "it", "on", "in", "at", "or", "buy", "about", "tell",
  "show", "looking", "give", "got", "a", "per", "each",
  // units — sizes belong in the product, not the search keyword
  "inch", "inches", "in.", "ft", "ft.", "feet", "foot", "lb", "lbs", "pound",
]);

// ─── Negative-keyword filter ──────────────────────────────────────────────────
//
// When a user asks for a "regular" or unmodified product, we exclude specialty
// variants from the results UNLESS the user explicitly requested them.

type NegativeRule = {
  /** Tokens that must appear in the query for this rule to activate. */
  trigger: string[];
  /** Tokens that, if present in the query, DISABLE this rule (user asked for the variant). */
  explicit: string[];
  /** Lowercase substrings to exclude from product titles/SKUs. */
  exclude: string[];
};

const NEGATIVE_RULES: NegativeRule[] = [
  // drywall / sheetrock → exclude specialty boards unless asked
  {
    trigger: ["drywall", "sheetrock", "gypsum"],
    explicit: ["impact", "high-impact", "hi-impact", "hi impact", "highimpact",
      "mold", "mould", "abuse", "fire", "type-x", "typex", "type-c", "typec",
      "moisture", "purple", "humitek", "xp"],
    exclude: ["high-impact", "high impact", "hi-impact", "hi impact", "xp",
      "mold-resistant", "mold resistant", "abuse-resistant", "abuse resistant",
      "fire-rated", "fire rated", "type x", "type-x", "type c", "type-c",
      "moisture resistant", "moisture-resistant", "purple board", "humitek"],
  },
  // screws — "drywall screws" should NOT return self-drilling / tek / metal-stud screws
  {
    trigger: ["screw", "screws"],
    explicit: ["self-drilling", "selfdrilling", "self-tap", "selftap", "tek",
      "metal stud", "metal-stud", "sheet metal"],
    exclude: ["self-drilling", "self drilling", "self-tapping", "self tapping",
      "tek screw", "tek-screw", "metal stud screw", "sheet metal screw"],
  },
  // lumber / studs / 2x4 / 2x6 → exclude treated/specialty unless asked
  {
    trigger: ["lumber", "stud", "studs", "2x4", "2x6", "2x8", "2x10", "2x12", "board", "boards"],
    explicit: ["treated", "pressure-treated", "pt", "cedar", "redwood",
      "composite", "fire-retardant", "fire retardant"],
    exclude: ["pressure-treated", "pressure treated", "treated lumber", "treated board",
      " pt ", "cedar", "redwood", "composite", "fire-retardant", "fire retardant"],
  },
  // nails → exclude specialty nails unless asked
  {
    trigger: ["nail", "nails"],
    explicit: ["roofing", "concrete", "masonry", "ring", "spiral", "galvanized"],
    exclude: ["roofing nail", "concrete nail", "masonry nail"],
  },
];

/** True if a product should be EXCLUDED based on the negative-keyword rules. */
function isSpecialtyVariant(query: string, productTitle: string): boolean {
  const queryLower = query.toLowerCase();
  const titleLower = productTitle.toLowerCase();
  for (const rule of NEGATIVE_RULES) {
    if (!rule.trigger.some((t) => queryLower.includes(t))) continue;
    if (rule.explicit.some((e) => queryLower.includes(e))) continue;
    if (rule.exclude.some((e) => titleLower.includes(e))) return true;
  }
  return false;
}

/** A bare size like "4x8", "5/8", '1/2"' — useless as a standalone search term. */
function isDimension(t: string): boolean {
  return /^\d+x\d+$/.test(t) || /^\d+(\.\d+)?\/\d+$/.test(t) || /^[\d/."x-]+$/.test(t);
}

/** "3 5/8" → "3-5/8" so a whole-plus-fraction size stays one token, like the catalog. */
function normalizeSizes(s: string): string {
  return s.toLowerCase().replace(/(\d+)\s+(\d+\/\d+)/g, "$1-$2");
}

/** Pull the specific size a customer asked for ("3-5/8", "2x4", "5/8") for ranking. */
export function sizeSignature(query: string): string | null {
  const q = normalizeSizes(query);
  const m = q.match(/\d+-\d+\/\d+/) || q.match(/\d+x\d+/) || q.match(/\d+\/\d+/);
  return m ? m[0] : null;
}

/** ALL sizes in a query — a term like "5/8 drywall 4x8" carries thickness AND sheet size. */
function sizeSignatures(query: string): string[] {
  const q = normalizeSizes(query);
  const out: string[] = [];
  for (const re of [/\d+-\d+\/\d+/g, /\d+x\d+/g, /\d+\/\d+/g]) {
    const m = q.match(re);
    if (m) out.push(...m);
  }
  return Array.from(new Set(out));
}

/**
 * Contractor slang → how Go Build Supply actually names things in the catalog.
 * REPLACEMENTS are tried first (the slang word isn't in the catalog at all,
 * e.g. "drywall sheet" → "gypsum board"). FALLBACKS are tried last (the literal
 * term usually works, but generalize if it doesn't, e.g. "2x4" → "framing lumber").
 */
function expandReplacements(tokens: string[]): string[] {
  const has = (w: string) => tokens.includes(w);
  const out: string[] = [];
  // Drywall mud/tape/screws are their own items — don't turn those into board.
  const drywallAccessory = ["tape", "screw", "screws", "mud", "compound",
    "adhesive", "primer", "corner", "sander", "knife", "saw", "lift", "anchor"]
    .some(has);
  // Any non-accessory drywall/sheetrock/gypsum mention means the BOARD itself,
  // which the catalog calls "gypsum board". (Accessories like tape/mud/screws
  // are handled separately above and excluded here.)
  if ((has("drywall") || has("sheetrock") || has("gypsum")) && !drywallAccessory)
    out.push("gypsum board");
  if (has("mud") || (has("joint") && has("compound")) ||
      (has("drywall") && has("compound"))) {
    out.push("drywall joint compound", "joint compound");
  }
  // The store writes lumber sizes longhand: "2x4" is catalogued as "2 in. x 4 in.".
  // Convert any NxM size to that form so studs/lumber match the real product.
  const dimTok = tokens.find((t) => /^\d+x\d+$/.test(t));
  if (dimTok) {
    const m = dimTok.match(/^(\d+)x(\d+)$/);
    if (m) out.push(`${m[1]} in. x ${m[2]} in.`);
  }
  // Wall insulation is catalogued as "fiberglass insulation"; bare "insulation"
  // returns pipe insulation first.
  if (has("insulation") && !has("pipe") && !has("foam"))
    out.push("fiberglass insulation");
  return out;
}

function expandFallbacks(tokens: string[]): string[] {
  const has = (w: string) => tokens.includes(w);
  const out: string[] = [];
  if (has("stud") || has("studs") || has("2x4") || has("2x6") ||
      (has("framing") && !has("nail") && !has("nails")))
    out.push("framing lumber");
  if (has("plywood") || has("osb") || has("sheathing")) out.push("sheathing");
  return out;
}

/** Turn a conversational message into clean, searchable keyword candidates. */
function keywordCandidates(query: string): string[] {
  const tokens = normalizeSizes(query)
    .replace(/[^a-z0-9\s\/."'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  if (!tokens.length) return [query.trim()].filter(Boolean);

  // The material words (drywall, lumber…) without bare sizes. A size alone like
  // "4x8" matches random products, so it must never be a standalone search.
  const words = tokens.filter((t) => !isDimension(t));

  // "size + main noun" (e.g. "3-5/8 track") — broad enough to include the right
  // product even when adjectives like "metal" would wrongly exclude it.
  const sig = sizeSignature(query);
  const noun = words[words.length - 1];
  const sizeNoun = sig && noun ? [`${sig} ${noun}`] : [];

  const candidates = [
    ...expandReplacements(tokens),  // catalog terms for slang the store doesn't use
    ...sizeNoun,                    // size + noun, so the right-sized item is in the pool
    tokens.join(" "),               // all meaningful words
    words.slice(0, 2).join(" "),    // leading two real words
    words.slice(-2).join(" "),      // trailing two real words (usually the product)
    words[0],                       // the first real material word (never a size)
    words.slice(-1).join(" "),      // the single key noun
    ...expandFallbacks(tokens),     // generalize only if nothing specific hit
  ];
  // Drop empties and any candidate that is nothing but a dimension.
  return Array.from(new Set(candidates))
    .filter((c) => c && !isDimension(c.trim()));
}

function mapBcProduct(p: any): ShopifyProduct {
  const storeUrl = (ENV.bcStoreUrl || "https://gobuildsupply.com").replace(/\/+$/, "");
  // calculated_price reflects sales/rules; fall back to base price.
  const priceNum =
    typeof p.calculated_price === "number" && p.calculated_price > 0
      ? p.calculated_price
      : p.price ?? 0;
  const firstVariant = Array.isArray(p.variants) ? p.variants[0] : null;
  const firstImage =
    (Array.isArray(p.images) ? p.images.find((i: any) => i.is_thumbnail) ?? p.images[0] : null) ?? null;
  const path = p.custom_url?.url ?? `/${p.id}`;

  return {
    id: p.id,
    title: p.name,
    handle: String(p.id),
    price: Number(priceNum).toFixed(2),
    compare_at_price:
      p.sale_price && p.price && p.sale_price < p.price ? Number(p.price).toFixed(2) : null,
    image: firstImage?.url_standard ?? firstImage?.url_thumbnail ?? null,
    url: `${storeUrl}${path}`,
    available: p.availability !== "disabled" && (p.inventory_level == null || p.inventory_level > 0),
    variantId: firstVariant?.id ?? p.id,
    sku: p.sku || firstVariant?.sku || null,
  };
}

async function bcGet(pathAndQuery: string): Promise<any | null> {
  const base = `https://api.bigcommerce.com/stores/${ENV.bcStoreHash}/v3`;
  let res: Response;
  try {
    res = await fetch(`${base}${pathAndQuery}`, {
      headers: {
        "X-Auth-Token": ENV.bcAccessToken,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error(`[BigCommerce] Network error: ${err}`);
    return null;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[BigCommerce] Request failed: ${res.status} ${body.slice(0, 160)}`);
    return null;
  }
  return res.json();
}

async function fetchByKeyword(keyword: string, limit: number): Promise<ShopifyProduct[]> {
  // No is_visible filter: the store is still "Coming Soon", so many real
  // products aren't published to the storefront yet but should still be findable.
  const json = (await bcGet(
    `/catalog/products?keyword=${encodeURIComponent(keyword)}&limit=${limit}&include=images,variants`,
  )) as { data?: any[] } | null;
  return (json?.data ?? []).map(mapBcProduct);
}

/** Plain catalog listing (no keyword) — for the website's browse/featured grids. */
export async function listBigCommerceProducts(
  page = 1,
  limit = 12,
  categoryIds?: number[],
): Promise<ShopifyProduct[]> {
  if (!isBigCommerceConfigured()) return [];
  const catFilter = categoryIds?.length
    ? `&categories:in=${categoryIds.slice(0, 60).join(",")}`
    : "";
  const json = (await bcGet(
    `/catalog/products?limit=${limit}&page=${page}&include=images,variants&sort=total_sold&direction=desc${catFilter}`,
  )) as { data?: any[] } | null;
  return (json?.data ?? []).map(mapBcProduct);
}

/** Total products / categories / brands — for the homepage stats bar. */
export async function getBcCounts(): Promise<{ products: number; categories: number; brands: number }> {
  if (!isBigCommerceConfigured()) return { products: 0, categories: 0, brands: 0 };
  const total = (json: any) => json?.meta?.pagination?.total ?? 0;
  const [p, c, b] = await Promise.all([
    bcGet(`/catalog/products?limit=1`),
    bcGet(`/catalog/categories?limit=1`),
    bcGet(`/catalog/brands?limit=1`),
  ]);
  return { products: total(p), categories: total(c), brands: total(b) };
}

export type BcCategory = {
  id: number;
  name: string;
  parentId: number;
  isVisible: boolean;
  sortOrder: number;
};

/** All store categories (paginated fetch). */
export async function listBigCommerceCategories(): Promise<BcCategory[]> {
  if (!isBigCommerceConfigured()) return [];
  const all: BcCategory[] = [];
  for (let page = 1; page <= 5; page++) {
    const json = (await bcGet(`/catalog/categories?limit=250&page=${page}`)) as {
      data?: any[];
      meta?: { pagination?: { total_pages?: number } };
    } | null;
    const rows = json?.data ?? [];
    all.push(
      ...rows.map((c: any) => ({
        id: c.id,
        name: c.name,
        parentId: c.parent_id,
        isVisible: c.is_visible !== false,
        sortOrder: c.sort_order ?? 0,
      })),
    );
    const totalPages = json?.meta?.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
  }
  return all;
}

export type ProductDetails = ShopifyProduct & {
  images: string[];
  brand: string | null;
  specs: Array<{ label: string; value: string }>;
  categoryIds: number[];
};

const brandCache = new Map<number, string | null>();

async function getBrandName(brandId: number): Promise<string | null> {
  if (!brandId) return null;
  if (brandCache.has(brandId)) return brandCache.get(brandId)!;
  const json = (await bcGet(`/catalog/brands/${brandId}`)) as { data?: { name?: string } } | null;
  const name = json?.data?.name ?? null;
  brandCache.set(brandId, name);
  return name;
}

/** Fetch a single product with everything the product page shows. */
export async function getBigCommerceProduct(id: number): Promise<ProductDetails | null> {
  if (!isBigCommerceConfigured()) return null;
  const json = (await bcGet(
    `/catalog/products/${id}?include=images,variants,custom_fields`,
  )) as { data?: any } | null;
  const p = json?.data;
  if (!p) return null;

  const images: string[] = (Array.isArray(p.images) ? p.images : [])
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((i: any) => i.url_standard ?? i.url_thumbnail)
    .filter(Boolean);

  const specs: Array<{ label: string; value: string }> = [];
  for (const f of Array.isArray(p.custom_fields) ? p.custom_fields : []) {
    if (f?.name && f?.value) specs.push({ label: String(f.name), value: String(f.value) });
  }
  if (p.weight > 0) specs.push({ label: "Weight", value: `${p.weight} lb` });
  if (p.width > 0 && p.height > 0 && p.depth > 0) {
    specs.push({ label: "Dimensions", value: `${p.width} × ${p.height} × ${p.depth} in` });
  }
  if (p.mpn) specs.push({ label: "MPN", value: String(p.mpn) });
  if (p.upc) specs.push({ label: "UPC", value: String(p.upc) });

  const brand = await getBrandName(p.brand_id ?? 0).catch(() => null);

  return {
    ...mapBcProduct(p),
    description: p.description || null,
    images,
    brand,
    specs,
    categoryIds: Array.isArray(p.categories) ? p.categories : [],
  };
}

/**
 * Create a real BigCommerce cart from line items and return the hosted
 * checkout URL. Requires the API token to have the "Carts" scope — if it
 * doesn't, this returns null and the caller should fall back gracefully.
 */
export async function createBigCommerceCheckout(
  lines: Array<{ productId: number; quantity: number }>,
): Promise<string | null> {
  if (!isBigCommerceConfigured() || !lines.length) return null;
  const base = `https://api.bigcommerce.com/stores/${ENV.bcStoreHash}/v3`;
  try {
    const res = await fetch(`${base}/carts?include=redirect_urls`, {
      method: "POST",
      headers: {
        "X-Auth-Token": ENV.bcAccessToken,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        line_items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[BigCommerce] Cart create failed: ${res.status} ${body.slice(0, 160)}`);
      return null;
    }
    const json = (await res.json()) as { data?: { redirect_urls?: { checkout_url?: string; cart_url?: string } } };
    const url = json?.data?.redirect_urls?.checkout_url ?? json?.data?.redirect_urls?.cart_url ?? null;
    if (!url) return null;
    // The store's configured domain now points at THIS website (headless setup),
    // so BigCommerce-hosted checkout must run on the store's canonical domain.
    // Swap when a dedicated checkout domain is registered in BigCommerce.
    const checkoutHost = `store-${ENV.bcStoreHash}-1.mybigcommerce.com`;
    return url.replace(/^https:\/\/(www\.)?gobuildsupply\.com/, `https://${checkoutHost}`);
  } catch (err) {
    console.error(`[BigCommerce] Cart create error: ${err}`);
    return null;
  }
}

/**
 * Search real products on BigCommerce. Cleans conversational filler and retries
 * with fewer keywords until it finds matches. Returns the same product shape the
 * rest of the app already uses, so nothing downstream changes.
 */
export async function searchBigCommerce(
  query: string,
  limit = 5,
): Promise<ShopifyProduct[]> {
  if (!isBigCommerceConfigured()) return [];

  // If the customer named a specific size (e.g. "3-5/8"), the store's relevance
  // alone returns the wrong size first — so pull a wider pool and float the
  // products whose name actually contains that size to the top.
  const sizes = sizeSignatures(query);

  for (const keyword of keywordCandidates(query)) {
    // Always pull a wider pool so the size ranking and the specialty filter have
    // enough candidates to work with (the right item may not be in the first 1-2).
    const raw = await fetchByKeyword(keyword, Math.max(limit, 12));
    if (!raw.length) continue;

    // If the customer named a size, honor it first — match on ANY size in the
    // query (a term like "5/8 drywall 4x8" has both thickness and sheet size).
    // Give them that exact size even if the only thing stocked in it is a
    // "specialty" variant; prefer a standard variant when one exists in the size.
    if (sizes.length) {
      const sizeHits = raw.filter((p) => {
        const t = normalizeSizes(p.title);
        return sizes.some((s) => t.includes(s));
      });
      if (sizeHits.length) {
        const clean = sizeHits.filter((p) => !isSpecialtyVariant(query, p.title));
        return (clean.length ? clean : sizeHits).slice(0, limit);
      }
    }

    // No specific size (or none matched): drop specialty variants the user didn't
    // ask for. If that removes everything, keep raw (store may only carry it).
    const filtered = raw.filter((p) => !isSpecialtyVariant(query, p.title));
    return (filtered.length ? filtered : raw).slice(0, limit);
  }
  return [];
}

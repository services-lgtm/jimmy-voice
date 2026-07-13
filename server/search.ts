/**
 * server/search.ts
 * Smart in-memory product search for the website.
 *
 * Loads the full catalog (name, SKU, brand, categories, identifiers) into
 * memory and scores queries with token/prefix/substring/typo matching —
 * far more forgiving than BigCommerce's all-keywords-must-match search.
 * Index refreshes in the background; callers fall back to the BigCommerce
 * keyword search until the first load completes.
 */

import { ENV } from "./_core/env";
import { isBigCommerceConfigured } from "./bigcommerce";
import type { ShopifyProduct } from "./shopify";

type Doc = {
  product: ShopifyProduct;
  tokens: Set<string>;
  name: string; // normalized full name
  sku: string; // normalized sku
};

let docs: Doc[] = [];
let loadedAt = 0;
let loading: Promise<void> | null = null;

const REFRESH_MS = 15 * 60 * 1000;

// ─── Normalization ────────────────────────────────────────────────────────────

/** "3 5/8" → "3-5/8" and lowercase; keeps sizes as single tokens. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d+)\s+(\d+\/\d+)/g, "$1-$2")
    .replace(/[®™©]/g, " ")
    .replace(/[^a-z0-9/x.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[\s,]+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter((t) => t.length > 1 || /^\d$/.test(t));
}

/** naive singular: screws → screw, boxes → box */
function singular(t: string): string {
  if (t.length > 4 && t.endsWith("es")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

/** true if a and b are within one edit (insert/delete/replace) */
function within1Edit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la === lb) { i++; j++; }
    else if (la > lb) i++;
    else j++;
  }
  return edits + (la - i) + (lb - j) <= 1;
}

// ─── Index loading ────────────────────────────────────────────────────────────

async function bcPage(page: number): Promise<{ data: any[]; totalPages: number }> {
  const url =
    `https://api.bigcommerce.com/stores/${ENV.bcStoreHash}/v3/catalog/products` +
    `?limit=250&page=${page}&include=images` +
    `&include_fields=name,sku,price,calculated_price,sale_price,availability,inventory_level,custom_url,brand_id,categories,mpn,upc,gtin`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": ENV.bcAccessToken, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`search index page ${page}: HTTP ${res.status}`);
  const json = (await res.json()) as { data: any[]; meta: { pagination: { total_pages: number } } };
  return { data: json.data ?? [], totalPages: json.meta?.pagination?.total_pages ?? 1 };
}

async function fetchNames(path: string): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(
      `https://api.bigcommerce.com/stores/${ENV.bcStoreHash}/v3${path}?limit=250&page=${page}`,
      { headers: { "X-Auth-Token": ENV.bcAccessToken, Accept: "application/json" } },
    );
    if (!res.ok) break;
    const json = (await res.json()) as { data?: any[]; meta?: { pagination?: { total_pages?: number } } };
    for (const row of json.data ?? []) out.set(row.id, row.name);
    if (page >= (json.meta?.pagination?.total_pages ?? 1)) break;
  }
  return out;
}

async function buildIndex(): Promise<void> {
  const storeUrl = (ENV.bcStoreUrl || "https://gobuildsupply.com").replace(/\/+$/, "");
  const [catNames, brandNames] = await Promise.all([
    fetchNames("/catalog/categories"),
    fetchNames("/catalog/brands"),
  ]);

  const next: Doc[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, totalPages: tp } = await bcPage(page);
    totalPages = tp;
    for (const p of data) {
      const priceNum =
        typeof p.calculated_price === "number" && p.calculated_price > 0
          ? p.calculated_price
          : (p.price ?? 0);
      const firstImage =
        (Array.isArray(p.images) ? p.images.find((i: any) => i.is_thumbnail) ?? p.images[0] : null) ??
        null;
      const product: ShopifyProduct = {
        id: p.id,
        title: p.name,
        handle: String(p.id),
        price: Number(priceNum).toFixed(2),
        compare_at_price:
          p.sale_price && p.price && p.sale_price < p.price ? Number(p.price).toFixed(2) : null,
        image: firstImage?.url_standard ?? firstImage?.url_thumbnail ?? null,
        url: `${storeUrl}${p.custom_url?.url ?? `/${p.id}`}`,
        available:
          p.availability !== "disabled" && (p.inventory_level == null || p.inventory_level > 0),
        variantId: p.id,
        sku: p.sku || null,
      };
      const parts = [
        p.name,
        p.sku,
        p.mpn,
        p.upc,
        p.gtin,
        brandNames.get(p.brand_id) ?? "",
        ...(Array.isArray(p.categories) ? p.categories.map((c: number) => catNames.get(c) ?? "") : []),
      ]
        .filter(Boolean)
        .join(" ");
      const tokens = new Set<string>();
      for (const t of tokenize(parts)) {
        tokens.add(t);
        tokens.add(singular(t));
      }
      next.push({ product, tokens, name: normalize(p.name), sku: (p.sku || "").toLowerCase() });
    }
    page++;
  } while (page <= totalPages);

  docs = next;
  loadedAt = Date.now();
  console.log(`[Search] index built: ${docs.length} products`);
}

/** Kick off (re)indexing if needed; never throws. */
export function ensureIndex(): void {
  if (!isBigCommerceConfigured()) return;
  if (loading || (docs.length && Date.now() - loadedAt < REFRESH_MS)) return;
  loading = buildIndex()
    .catch((err) => console.error("[Search] index build failed:", err))
    .finally(() => {
      loading = null;
    });
}

export function indexReady(): boolean {
  return docs.length > 0;
}

/**
 * Products whose (lowercased) SKU passes `test`, with photographed items floated
 * to the top, then paginated. Powers category/subcategory browsing off the
 * spreadsheet taxonomy (see server/taxonomy.ts) without extra BigCommerce calls.
 */
export function filterCatalogBySku(
  test: (sku: string) => boolean,
  page: number,
  limit: number,
): { products: ShopifyProduct[]; total: number } {
  ensureIndex();
  const matched = docs.filter((d) => d.sku && test(d.sku));
  // Stable sort keeps pagination consistent; photos first while images fill in.
  matched.sort((a, b) => Number(!!b.product.image) - Number(!!a.product.image));
  const total = matched.length;
  const start = (page - 1) * limit;
  return {
    products: matched.slice(start, start + limit).map((d) => d.product),
    total,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function smartSearch(query: string, limit = 24): ShopifyProduct[] {
  ensureIndex();
  if (!docs.length) return [];

  const q = normalize(query);
  const qTokens = tokenize(query).map(singular);
  if (!qTokens.length) return [];

  const scored: Array<{ doc: Doc; score: number }> = [];
  for (const doc of docs) {
    let matched = 0;
    let score = 0;
    for (const qt of qTokens) {
      if (doc.tokens.has(qt)) {
        matched++;
        score += 5;
        continue;
      }
      // prefix ("insul" → insulation) for stems of 3+ chars
      let hit = false;
      const docTokens = Array.from(doc.tokens);
      if (qt.length >= 3) {
        for (const dt of docTokens) {
          if (dt.startsWith(qt)) { score += 3; hit = true; break; }
        }
      }
      if (!hit && qt.length >= 5) {
        for (const dt of docTokens) {
          if (Math.abs(dt.length - qt.length) <= 1 && within1Edit(dt, qt)) {
            score += 2; hit = true; break;
          }
        }
      }
      if (!hit && qt.length >= 3 && doc.name.includes(qt)) { score += 1.5; hit = true; }
      if (hit) matched++;
    }
    if (!matched) continue;
    const coverage = matched / qTokens.length;
    if (coverage < 0.6 && qTokens.length > 1) continue; // most words should match
    score *= coverage;
    if (doc.sku === q) score += 100; // exact SKU typed
    if (doc.name === q) score += 50;
    if (doc.product.image) score += 0.7;
    if (doc.product.available) score += 0.3;
    scored.push({ doc, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.doc.product);
}

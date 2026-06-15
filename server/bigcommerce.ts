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
]);

/**
 * Contractor slang → how Go Build Supply actually names things in the catalog.
 * REPLACEMENTS are tried first (the slang word isn't in the catalog at all,
 * e.g. "drywall sheet" → "gypsum board"). FALLBACKS are tried last (the literal
 * term usually works, but generalize if it doesn't, e.g. "2x4" → "framing lumber").
 */
function expandReplacements(tokens: string[]): string[] {
  const has = (w: string) => tokens.includes(w);
  const out: string[] = [];
  if ((has("drywall") || has("sheetrock") || has("gypsum")) &&
      (has("sheet") || has("sheets") || has("board") || has("panel") || has("wall")))
    out.push("gypsum board");
  if (has("mud") || (has("joint") && has("compound")) ||
      (has("drywall") && has("compound"))) {
    out.push("drywall joint compound", "joint compound");
  }
  // "2x4 stud" — the bare dimension finds real lumber; "stud" pulls in insulation.
  const dim = tokens.find((t) => /^\d+x\d+$/.test(t));
  if (dim && (has("stud") || has("studs"))) out.push(dim);
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
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s\/."'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  if (!tokens.length) return [query.trim()].filter(Boolean);

  const candidates = [
    ...expandReplacements(tokens),  // catalog terms for slang the store doesn't use
    tokens.join(" "),               // all meaningful words
    tokens.slice(0, 2).join(" "),   // leading two (e.g. "2x4 framing")
    tokens.slice(-2).join(" "),     // trailing two (usually the product)
    tokens[0],                      // the first key word (e.g. "2x4")
    tokens.slice(-1).join(" "),     // the single key noun
    ...expandFallbacks(tokens),     // generalize only if nothing specific hit
  ];
  return Array.from(new Set(candidates)).filter(Boolean);
}

async function fetchByKeyword(keyword: string, limit: number): Promise<ShopifyProduct[]> {
  const base = `https://api.bigcommerce.com/stores/${ENV.bcStoreHash}/v3`;
  // No is_visible filter: the store is still "Coming Soon", so many real
  // products aren't published to the storefront yet but should still be findable.
  const url =
    `${base}/catalog/products?keyword=${encodeURIComponent(keyword)}` +
    `&limit=${limit}&include=images,variants`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "X-Auth-Token": ENV.bcAccessToken,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error(`[BigCommerce] Network error: ${err}`);
    return [];
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[BigCommerce] Search failed: ${res.status} ${body.slice(0, 160)}`);
    return [];
  }

  const json = (await res.json()) as { data?: any[] };
  const products = json?.data ?? [];
  const storeUrl = (ENV.bcStoreUrl || "https://gobuildsupply.com").replace(/\/+$/, "");

  return products.map((p: any): ShopifyProduct => {
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
  });
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

  // Try each keyword candidate in priority order; the store's own search
  // relevance is good once it gets the right words, so we trust its ordering.
  for (const keyword of keywordCandidates(query)) {
    const results = await fetchByKeyword(keyword, limit);
    if (results.length) return results;
  }
  return [];
}

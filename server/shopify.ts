/**
 * server/shopify.ts
 * Go Build Supply (Shopify) — product search + cart helpers
 *
 * All calls use Shopify's public storefront JSON endpoints.
 * No API key is required for read-only product search.
 * Cart operations use the AJAX Cart API (session-based).
 */

import { isBigCommerceConfigured, searchBigCommerce } from "./bigcommerce";

const STORE = "https://www.gobuildsupply.com";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  price: string;         // string like "18.21"
  compare_at_price: string | null;
  image: string | null;
  url: string;
  available: boolean;
  variantId: number | null;
  sku: string | null;
};

export type CartItem = {
  variantId: number;
  quantity: number;
  title: string;
  price: string;
  image: string | null;
  url: string;
  sku: string | null;
};

export type CartResult = {
  token: string;
  items: CartItem[];
  total_price: number;   // cents
  item_count: number;
  shareUrl: string | null;
};

// ─── Demo catalog ─────────────────────────────────────────────────────────────
// The live Go Build Supply store is still in "Coming Soon" mode (and runs on
// BigCommerce, not Shopify), so the search API returns nothing. Until the store
// launches, we fall back to this sample shelf so Jimmy can show real-looking
// product cards. Set USE_DEMO_PRODUCTS = false once the live catalog is wired up.
const USE_DEMO_PRODUCTS = true;

type DemoItem = { keywords: string[]; title: string; price: string };

const DEMO_CATALOG: DemoItem[] = [
  { keywords: ["drywall", "sheetrock", "gypsum", "wallboard"], title: '5/8" Drywall Sheet 4x8', price: "18.21" },
  { keywords: ["joint compound", "mud", "spackle"], title: "Joint Compound, 4.5 gal", price: "16.98" },
  { keywords: ["drywall tape", "joint tape", "mesh tape"], title: "Drywall Joint Tape, 500 ft", price: "7.42" },
  { keywords: ["corner bead"], title: 'Metal Corner Bead, 8 ft', price: "4.15" },
  { keywords: ["drywall screw", "screws"], title: "Drywall Screws 1-5/8\", 1 lb", price: "9.40" },
  { keywords: ["stud", "2x4", "lumber", "framing"], title: '2x4x8 Framing Stud', price: "5.27" },
  { keywords: ["plywood", "sheathing", "osb"], title: '7/16" OSB Sheathing 4x8', price: "21.60" },
  { keywords: ["framing nail", "nails"], title: 'Framing Nails 3-1/4", 5 lb', price: "22.50" },
  { keywords: ["joist hanger", "hanger"], title: "Galvanized Joist Hanger 2x8", price: "1.89" },
  { keywords: ["insulation", "batt", "fiberglass"], title: "R-13 Insulation Batts, 40 sq ft", price: "15.98" },
  { keywords: ["foam board", "rigid foam"], title: '1" Rigid Foam Board 4x8', price: "24.30" },
  { keywords: ["deck board", "decking", "5/4"], title: '5/4x6x12 Pressure-Treated Deck Board', price: "12.85" },
  { keywords: ["structural screw", "deck screw"], title: "Structural Deck Screws, 5 lb", price: "44.97" },
  { keywords: ["post anchor", "post base"], title: "Galvanized Post Base 6x6", price: "13.40" },
  { keywords: ["concrete", "quikrete", "cement bag"], title: "Concrete Mix, 60 lb Bag", price: "5.45" },
  { keywords: ["mortar", "thinset"], title: "Mortar Mix, 60 lb Bag", price: "8.20" },
  { keywords: ["rebar"], title: '#4 Rebar, 1/2" x 10 ft', price: "8.97" },
  { keywords: ["shingle", "roofing"], title: "Architectural Shingles, 33.3 sq ft", price: "38.50" },
  { keywords: ["underlayment", "felt"], title: "Synthetic Roof Underlayment, 10 sq", price: "94.00" },
  { keywords: ["drip edge"], title: 'Aluminum Drip Edge, 10 ft', price: "9.78" },
  { keywords: ["paint", "interior paint"], title: "Interior Latex Paint, 1 gal", price: "32.98" },
  { keywords: ["primer"], title: "All-Purpose Primer, 1 gal", price: "21.48" },
  { keywords: ["roller", "paint roller"], title: "Roller Frame + 3 Covers", price: "11.97" },
  { keywords: ["painter tape", "masking tape"], title: 'Painter\'s Tape, 1.88" x 60 yd', price: "6.97" },
  { keywords: ["drop cloth"], title: "Canvas Drop Cloth, 9x12", price: "14.98" },
  { keywords: ["tile"], title: "Porcelain Floor Tile, 12x24", price: "3.29" },
  { keywords: ["grout"], title: "Sanded Grout, 25 lb", price: "16.40" },
  { keywords: ["safety glasses", "goggles"], title: "Safety Glasses, Anti-Fog", price: "4.98" },
  { keywords: ["gloves", "work gloves"], title: "Work Gloves, Large", price: "8.47" },
  { keywords: ["utility knife", "blade"], title: "Utility Knife + 10 Blades", price: "9.99" },
];

function demoImage(text: string): string {
  const label = encodeURIComponent(text.length > 28 ? text.slice(0, 26) + "…" : text);
  return `https://placehold.co/400x400/FCEDD9/E04510?font=montserrat&text=${label}`;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

/** Best-effort demo product so a search always returns a believable card. */
function demoSearch(query: string, limit: number): ShopifyProduct[] {
  const q = query.toLowerCase();
  const scored = DEMO_CATALOG
    .map((item) => ({ item, score: item.keywords.filter((k) => q.includes(k) || k.split(" ").some((w) => q.includes(w))).length }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const picks: DemoItem[] = scored.length
    ? scored.slice(0, limit).map((s) => s.item)
    : [{ keywords: [], title: query.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40), price: "12.99" }];

  return picks.map((item, i) => {
    const handle = `demo-${slugify(item.title)}`;
    return {
      id: 900000 + Math.abs(hashCode(handle)) % 90000,
      title: item.title,
      handle,
      price: item.price,
      compare_at_price: null,
      image: demoImage(item.title),
      url: STORE,
      available: true,
      variantId: 990000000 + (Math.abs(hashCode(handle)) % 9000000) + i,
      sku: `DEMO-${slugify(item.title).toUpperCase().replace(/-/g, "").slice(0, 8)}`,
    };
  });
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// ─── Product search ───────────────────────────────────────────────────────────

/**
 * Search Go Build Supply products using Shopify's predictive search API.
 * Returns up to `limit` products matching the query. Falls back to the demo
 * catalog while the live store is offline.
 */
export async function searchProducts(
  query: string,
  limit = 5,
): Promise<ShopifyProduct[]> {
  // 1. Preferred: real products + live pricing from BigCommerce (if configured).
  if (isBigCommerceConfigured()) {
    const bc = await searchBigCommerce(query, limit);
    if (bc.length) return bc;
    // configured but no match for this query — fall through to demo so a card still shows
  }

  // 2. Legacy Shopify storefront search (kept for reference; returns nothing on this store).
  try {
    const url = `${STORE}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=${limit}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (res.ok) {
      const json = (await res.json()) as { resources?: { results?: { products?: any[] } } };
      const products: any[] = json?.resources?.results?.products ?? [];
      if (products.length) {
        return products.map((p: any) => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          price: p.price ?? "0.00",
          compare_at_price: p.compare_at_price ?? null,
          image: p.featured_image?.url ?? p.image ?? null,
          url: `${STORE}${p.url}`,
          available: p.available !== false,
          variantId: null, // filled in by fetchVariantId
          sku: null,
        }));
      }
    } else {
      console.error(`[Shopify] Search failed: ${res.status}`);
    }
  } catch (err) {
    console.error(`[Shopify] Search error: ${err}`);
  }

  // Live store returned nothing — use the demo shelf so Jimmy stays visual.
  if (USE_DEMO_PRODUCTS) {
    console.log(`[Demo] Serving sample products for "${query}"`);
    return demoSearch(query, limit);
  }
  return [];
}

/**
 * Fetch the first variant ID for a product handle.
 * Needed to add the product to a Shopify cart.
 */
export async function fetchVariantId(
  handle: string,
): Promise<{ variantId: number | null; sku: string | null }> {
  try {
    const res = await fetch(`${STORE}/products/${handle}.json`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { variantId: null, sku: null };
    const json = (await res.json()) as { product?: { variants?: any[] } };
    const variant = json?.product?.variants?.[0];
    return {
      variantId: variant?.id ?? null,
      sku: variant?.sku ?? null,
    };
  } catch {
    return { variantId: null, sku: null };
  }
}

/**
 * Search products AND resolve variant IDs in parallel.
 */
export async function searchProductsWithVariants(
  query: string,
  limit = 3,
): Promise<ShopifyProduct[]> {
  const products = await searchProducts(query, limit);
  if (!products.length) return [];

  const withVariants = await Promise.all(
    products.map(async (p) => {
      // Demo products already carry a variant id — don't hit the dead store.
      if (p.variantId != null) return p;
      const { variantId, sku } = await fetchVariantId(p.handle);
      return { ...p, variantId, sku };
    }),
  );

  return withVariants;
}

// ─── Cart helpers (server-side proxy) ────────────────────────────────────────
// Shopify's AJAX cart is session-based (cookie), so we proxy the calls through
// the browser. The frontend calls our tRPC procedures which return the cart
// payload; the actual add-to-cart POST is made from the BROWSER so the
// Shopify session cookie is attached automatically.
//
// For the cart share link we use the bevy ShareCart attribute already present
// in the Go Build Supply cart.

/**
 * Build a Shopify cart permalink URL from a list of variant IDs and quantities.
 * This URL opens the cart pre-populated with all items.
 *
 * Format: /cart/VARIANT_ID:QTY,VARIANT_ID:QTY?...
 */
export function buildCartPermalink(
  items: Array<{ variantId: number; quantity: number }>,
): string {
  const itemStr = items
    .filter((i) => i.variantId)
    .map((i) => `${i.variantId}:${i.quantity}`)
    .join(",");
  return `${STORE}/cart/${itemStr}`;
}

/**
 * Format price in cents to a USD string.
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

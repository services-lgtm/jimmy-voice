/**
 * server/routers/catalog.ts
 * Product browsing + checkout handoff for the GBS website.
 * Real data comes from BigCommerce; falls back to the demo shelf while
 * the live catalog is still filling in.
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  isBigCommerceConfigured,
  listBigCommerceProducts,
  listBigCommerceCategories,
  getBigCommerceProduct,
  createBigCommerceCheckout,
  getBcCounts,
  type BcCategory,
} from "../bigcommerce";
import { demoListProducts, searchProducts } from "../shopify";

// ─── Category cache ───────────────────────────────────────────────────────────
// The tree changes rarely; cache for 10 minutes to keep pages snappy.

let catCache: { data: BcCategory[]; ts: number } | null = null;

async function getCategories(): Promise<BcCategory[]> {
  if (catCache && Date.now() - catCache.ts < 10 * 60 * 1000) return catCache.data;
  const data = await listBigCommerceCategories();
  if (data.length) catCache = { data, ts: Date.now() };
  return data;
}

/** A category plus every category nested under it. */
function withDescendants(all: BcCategory[], rootId: number): number[] {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const c of all) {
      if (c.parentId === parent) {
        ids.push(c.id);
        queue.push(c.id);
      }
    }
  }
  return ids;
}

// Store-size stats for the hero (cached 10 min)
let statsCache: { data: { products: number; categories: number; brands: number }; ts: number } | null = null;

export const catalogRouter = router({
  /** Catalog size — real numbers for the homepage hero. */
  stats: publicProcedure.query(async () => {
    if (statsCache && Date.now() - statsCache.ts < 10 * 60 * 1000) return statsCache.data;
    const counts = await getBcCounts();
    if (counts.products > 0) statsCache = { data: counts, ts: Date.now() };
    return counts;
  }),

  /**
   * The store's real categories: the 19 main categories (Drywall, Lumber,
   * Plumbing, ...) each with its own subcategories, exactly like the live
   * store. Top departments ("Structure & Framing" etc.) only define order.
   */
  categories: publicProcedure.query(async () => {
    const all = await getCategories();
    const usable = (c: BcCategory) => c.isVisible && !/^\d+$/.test(c.name.trim());
    const tops = all
      .filter((c) => c.parentId === 0 && usable(c) && !/^shop all$/i.test(c.name))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const groups = tops.flatMap((t) =>
      all
        .filter((c) => c.parentId === t.id && usable(c))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          children: all
            .filter((c) => c.parentId === cat.id && usable(c))
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => ({ id: c.id, name: c.name })),
        })),
    );
    return { groups };
  }),

  /** Browse products — text search, category filter, or best sellers. */
  list: publicProcedure
    .input(
      z.object({
        query: z.string().trim().max(120).optional(),
        categoryId: z.number().int().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(12),
      }),
    )
    .query(async ({ input }) => {
      if (input.query) {
        const products = await searchProducts(input.query, input.limit);
        return { products };
      }
      if (isBigCommerceConfigured()) {
        if (input.categoryId) {
          // Products live on leaf categories — include the whole subtree.
          const all = await getCategories();
          const ids = withDescendants(all, input.categoryId);
          const products = await listBigCommerceProducts(input.page, input.limit, ids);
          return { products };
        }
        // Pull a wider pool and float products that have photos to the top —
        // much of the catalog is still missing images while the store ramps up.
        const pool = await listBigCommerceProducts(input.page, Math.min(50, input.limit * 4));
        if (pool.length) {
          const withImage = pool.filter((p) => p.image);
          const withoutImage = pool.filter((p) => !p.image);
          return { products: [...withImage, ...withoutImage].slice(0, input.limit) };
        }
      }
      return { products: demoListProducts(input.limit) };
    }),

  /** One product by id, plus "contractors also ordered" from its category. */
  get: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      if (input.id >= 900000) {
        const demo = demoListProducts(100).find((p) => p.id === input.id) ?? null;
        return { product: demo, related: [] };
      }
      const product = await getBigCommerceProduct(input.id);
      let related: Awaited<ReturnType<typeof listBigCommerceProducts>> = [];
      if (product?.categoryIds?.length) {
        const pool = await listBigCommerceProducts(1, 12, product.categoryIds).catch(() => []);
        related = pool
          .filter((p) => p.id !== product.id)
          .sort((a, b) => Number(!!b.image) - Number(!!a.image))
          .slice(0, 6);
      }
      return { product, related };
    }),

  /**
   * Hand the local cart to BigCommerce checkout. Returns the hosted checkout
   * URL, or null when the API token lacks the Carts scope (frontend then
   * falls back to linking the store).
   */
  checkout: publicProcedure
    .input(
      z.object({
        items: z
          .array(z.object({ productId: z.number().int(), quantity: z.number().int().min(1).max(999) }))
          .min(1)
          .max(50),
      }),
    )
    .mutation(async ({ input }) => {
      // Demo products don't exist in the real store — exclude them.
      const real = input.items.filter((i) => i.productId < 900000);
      if (!real.length) return { url: null, skipped: input.items.length };
      const url = await createBigCommerceCheckout(
        real.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      );
      return { url, skipped: input.items.length - real.length };
    }),
});

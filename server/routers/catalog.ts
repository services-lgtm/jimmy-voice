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
  getBigCommerceProduct,
  createBigCommerceCheckout,
  getBcCounts,
} from "../bigcommerce";
import { demoListProducts, searchProducts, type ShopifyProduct } from "../shopify";
import { ensureIndex, indexReady, smartSearch } from "../search";
import { TAXONOMY, listByTaxonomy } from "../taxonomy";

// Warm the smart-search index as soon as the server starts.
ensureIndex();

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
   * The site organization: 19 categories → 218 subcategories, from the
   * customer's taxonomy file (server/taxonomy.ts). This is what drives shop
   * browsing — products are matched to it by SKU, not by BigCommerce's tree.
   */
  categories: publicProcedure.query(() => {
    return { categories: TAXONOMY };
  }),

  /** Browse products — text search, category filter, or best sellers. */
  list: publicProcedure
    .input(
      z.object({
        query: z.string().trim().max(120).optional(),
        catSlug: z.string().trim().max(80).optional(),
        subSlug: z.string().trim().max(80).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(12),
      }),
    )
    .query(async ({ input }) => {
      if (input.query) {
        // Smart in-memory search (typo/prefix/SKU/brand aware); falls back to
        // the BigCommerce keyword search until the index finishes loading.
        const products = indexReady()
          ? smartSearch(input.query, input.limit)
          : await searchProducts(input.query, input.limit);
        return { products, total: products.length };
      }
      if (input.catSlug) {
        // Browse by the customer's taxonomy — products matched by SKU against
        // the in-memory catalog. Warm the index if this is an early hit.
        ensureIndex();
        return listByTaxonomy(input.catSlug, input.subSlug, input.page, input.limit);
      }
      if (isBigCommerceConfigured()) {
        // Pull a wider pool and float products that have photos to the top —
        // much of the catalog is still missing images while the store ramps up.
        const { products: pool, total } = await listBigCommerceProducts(
          input.page,
          Math.min(50, input.limit * 4),
        );
        if (pool.length) {
          const withImage = pool.filter((p) => p.image);
          const withoutImage = pool.filter((p) => !p.image);
          return { products: [...withImage, ...withoutImage].slice(0, input.limit), total };
        }
      }
      const demo = demoListProducts(input.limit);
      return { products: demo, total: demo.length };
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
      let related: ShopifyProduct[] = [];
      if (product?.categoryIds?.length) {
        const pool = await listBigCommerceProducts(1, 12, product.categoryIds)
          .then((r) => r.products)
          .catch(() => [] as ShopifyProduct[]);
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

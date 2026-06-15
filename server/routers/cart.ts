/**
 * server/routers/cart.ts
 * tRPC procedures for product search and cart building
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  searchProductsWithVariants,
  buildCartPermalink,
  type ShopifyProduct,
} from "../shopify";

// ─── Types ────────────────────────────────────────────────────────────────────

const MaterialItemSchema = z.object({
  name: z.string(),       // e.g. "drywall sheets 5/8 inch"
  quantity: z.number(),   // how many
  unit: z.string(),       // e.g. "sheets", "lbs", "rolls"
  category: z.string(),   // e.g. "drywall", "fasteners", "insulation"
  searchQuery: z.string(), // optimized search query for Shopify
});

export type MaterialItem = z.infer<typeof MaterialItemSchema>;

// ─── Router ───────────────────────────────────────────────────────────────────

export const cartRouter = router({
  /**
   * Search for a single product on Go Build Supply.
   */
  searchProduct: publicProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().default(3) }))
    .query(async ({ input }) => {
      const products = await searchProductsWithVariants(input.query, input.limit);
      return { products };
    }),

  /**
   * Given a list of material items (from Jimmy's calculation),
   * search for matching products on Go Build Supply and return
   * a complete cart payload with permalink URL.
   *
   * This is the core "build cart" procedure.
   */
  buildCart: publicProcedure
    .input(
      z.object({
        materials: z.array(MaterialItemSchema).max(20),
      }),
    )
    .mutation(async ({ input }) => {
      // Search for each material in parallel
      const searchResults = await Promise.all(
        input.materials.map(async (material) => {
          const products = await searchProductsWithVariants(material.searchQuery, 2);
          // Pick the best available match (first available product)
          const best = products.find((p) => p.available) ?? products[0] ?? null;
          return {
            material,
            product: best,
          };
        }),
      );

      // Build cart items — only include materials with a matched product + variant
      const cartItems = searchResults
        .filter((r) => r.product?.variantId != null)
        .map((r) => ({
          material: r.material,
          product: r.product as ShopifyProduct,
          variantId: r.product!.variantId!,
          quantity: r.material.quantity,
        }));

      // Unmatched materials (no product found)
      const unmatched = searchResults
        .filter((r) => !r.product?.variantId)
        .map((r) => r.material);

      // Build cart permalink
      const cartUrl = buildCartPermalink(
        cartItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      );

      // Calculate estimated total
      const estimatedTotal = cartItems.reduce((sum, item) => {
        const price = parseFloat(item.product.price) || 0;
        return sum + price * item.quantity;
      }, 0);

      return {
        cartItems: cartItems.map((i) => ({
          materialName: i.material.name,
          materialUnit: i.material.unit,
          quantity: i.quantity,
          product: {
            id: i.product.id,
            title: i.product.title,
            handle: i.product.handle,
            price: i.product.price,
            image: i.product.image,
            url: i.product.url,
            variantId: i.variantId,
            sku: i.product.sku,
            available: i.product.available,
          },
        })),
        unmatched,
        cartUrl,
        estimatedTotal: estimatedTotal.toFixed(2),
        itemCount: cartItems.length,
      };
    }),
});

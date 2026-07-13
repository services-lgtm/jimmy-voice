/**
 * server/taxonomy.ts
 * The GBS site organization: 19 categories → 218 subcategories, defined by the
 * customer's spreadsheet (gobuild-organization-master.xlsx) and generated into
 * shared/taxonomy.ts + server/data/skuTaxonomy.generated.ts.
 *
 * We browse by OUR taxonomy (matched to live products by SKU), not by
 * BigCommerce's category tree. Category/subcategory pages filter the in-memory
 * catalog (server/search.ts) by SKU membership — no extra API calls.
 */
import { TAXONOMY, type TaxCategory } from "../shared/taxonomy";
import { SKU_TO_SUB } from "./data/skuTaxonomy.generated";
import { filterCatalogBySku } from "./search";

export { TAXONOMY };

const CAT_BY_SLUG = new Map(TAXONOMY.map((c) => [c.slug, c]));

export function findCategory(slug: string): TaxCategory | undefined {
  return CAT_BY_SLUG.get(slug);
}

/**
 * List products in a category (all its subcategories) or a single subcategory.
 * `subSlug` empty → the whole category.
 */
export function listByTaxonomy(
  catSlug: string,
  subSlug: string | undefined,
  page: number,
  limit: number,
): { products: import("./shopify").ShopifyProduct[]; total: number } {
  if (!CAT_BY_SLUG.has(catSlug)) return { products: [], total: 0 };
  if (subSlug) {
    const exact = `${catSlug}::${subSlug}`;
    return filterCatalogBySku((sku) => SKU_TO_SUB[sku] === exact, page, limit);
  }
  const prefix = `${catSlug}::`;
  return filterCatalogBySku((sku) => (SKU_TO_SUB[sku] ?? "").startsWith(prefix), page, limit);
}

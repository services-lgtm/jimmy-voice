/**
 * Search & browse — screen 06 + spec 6.4.
 * Browsing is organized by the GBS taxonomy: 19 categories → 218 subcategories
 * (from the customer's org file). Text search still spans the whole catalog.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProductCard, { type ProductCardData } from "@/components/gbs/ProductCard";
import AdBanner from "@/components/gbs/AdBanner";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function ShopPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [catSlug, setCatSlug] = useState<string | null>(params.get("cat"));
  const [subSlug, setSubSlug] = useState<string | null>(params.get("sub"));

  // React to navigation (homepage tiles, nav links)
  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setCatSlug(params.get("cat"));
    setSubSlug(params.get("sub"));
  }, [params]);

  const categories = trpc.catalog.categories.useQuery();
  const cats = categories.data?.categories ?? [];

  const activeCat = cats.find((c) => c.slug === catSlug) ?? null;
  const activeSub = activeCat?.subcategories.find((s) => s.slug === subSlug) ?? null;
  const activeName = activeSub?.name ?? activeCat?.name ?? null;

  const debouncedQ = useDebounced(query.trim(), 350);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProductCardData[]>([]);

  // New search/category/subcategory → start over from page 1
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [debouncedQ, catSlug, subSlug]);

  const results = trpc.catalog.list.useQuery({
    query: debouncedQ || undefined,
    catSlug: debouncedQ ? undefined : (catSlug ?? undefined),
    subSlug: debouncedQ ? undefined : (subSlug ?? undefined),
    page,
    limit: 24,
  });

  // Accumulate pages (dedupe by id)
  useEffect(() => {
    const incoming = results.data?.products;
    if (!incoming) return;
    setItems((prev) => {
      const base = page === 1 ? [] : prev;
      const seen = new Set(base.map((p) => p.id));
      return [...base, ...incoming.filter((p) => !seen.has(p.id))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.data]);

  const products = items;
  const total = results.data?.total ?? 0;
  // Search results aren't paginated (single best-match batch); browse is.
  const hasMore = !debouncedQ && total > products.length;

  function pickCategory(slug: string | null) {
    setQuery("");
    setSubSlug(null);
    setCatSlug((prev) => (prev === slug ? null : slug));
  }
  function pickSub(slug: string) {
    setQuery("");
    setSubSlug((prev) => (prev === slug ? null : slug));
  }

  return (
    <div className="container py-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gbs-gray-500" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) {
              setCatSlug(null);
              setSubSlug(null);
            }
          }}
          placeholder="Search 5,000+ products..."
          className="w-full h-13 py-3.5 pl-12 pr-11 rounded-md bg-gbs-gray-100 border-[1.5px] border-gbs-gray-300 focus:border-gbs-red focus:outline-none text-[15px] text-gbs-black placeholder:text-gbs-gray-500 transition-colors"
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gbs-gray-300/50 text-gbs-gray-500"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Category chips — the 19 GBS categories */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {cats.map((c) => {
          const active = catSlug === c.slug;
          return (
            <button
              key={c.slug}
              onClick={() => pickCategory(c.slug)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium border-[1.5px] transition ${
                active
                  ? "bg-gbs-red border-gbs-red text-white"
                  : "border-gbs-gray-300 text-gbs-gray-700 hover:border-gbs-red hover:text-gbs-red"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Subcategory chips for the active category */}
      {activeCat && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          {activeCat.subcategories.map((s) => {
            const active = subSlug === s.slug;
            return (
              <button
                key={s.slug}
                onClick={() => pickSub(s.slug)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition ${
                  active
                    ? "bg-gbs-black border-gbs-black text-white"
                    : "border-gbs-gray-300 text-gbs-gray-500 hover:border-gbs-black hover:text-gbs-black"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      <div className="mt-5 text-sm text-gbs-gray-500">
        {results.isLoading && page === 1
          ? "Loading..."
          : `${(total || products.length).toLocaleString()} product${(total || products.length) === 1 ? "" : "s"}${
              debouncedQ ? ` for “${debouncedQ}”` : activeName ? ` in ${activeName}` : ""
            }${hasMore ? ` · showing ${products.length}` : ""}`}
      </div>

      {results.isLoading && page === 1 ? (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gbs-gray-100 aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : products.length ? (
        <>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {products.length > 8 && (
            <div className="mt-4">
              <AdBanner slot="shop-grid" compact />
            </div>
          )}
          {products.length > 8 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.slice(8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={results.isFetching}
                className="h-12 px-8 rounded-md border-[1.5px] border-gbs-red text-gbs-red font-condensed font-bold uppercase tracking-[0.08em] hover:bg-gbs-red-tint disabled:opacity-50 active:scale-[0.97] transition"
              >
                {results.isFetching
                  ? "Loading..."
                  : `Load more (${(total - products.length).toLocaleString()} left)`}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-16 flex flex-col items-center text-center">
          <Search className="size-10 text-gbs-gray-300" />
          <div className="mt-3 font-condensed font-bold text-xl text-gbs-black">
            No results{debouncedQ ? ` for “${debouncedQ}”` : ""}
          </div>
          <p className="mt-1 text-sm text-gbs-gray-500">
            Try a different search or browse categories.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md">
            {cats.map((c) => (
              <button
                key={c.slug}
                onClick={() => pickCategory(c.slug)}
                className="rounded-full border-[1.5px] border-gbs-gray-300 px-3.5 py-1.5 text-[13px] font-medium text-gbs-gray-700 hover:border-gbs-red hover:text-gbs-red transition"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

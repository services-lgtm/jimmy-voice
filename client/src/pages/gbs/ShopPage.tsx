/**
 * Search & browse — screen 06 + spec 6.4.
 * Category filters mirror the LIVE store tree (groups → subcategories);
 * text search still works across the whole catalog.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProductCard, { type ProductCardData } from "@/components/gbs/ProductCard";

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
  const [catId, setCatId] = useState<number | null>(
    params.get("cat") ? Number(params.get("cat")) : null,
  );

  // React to navigation (homepage tiles, nav links)
  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setCatId(params.get("cat") ? Number(params.get("cat")) : null);
  }, [params]);

  const categories = trpc.catalog.categories.useQuery();
  const groups = categories.data?.groups ?? [];

  // Which top group does the selected category belong to (for showing sub-chips)?
  const activeGroup =
    groups.find((g) => g.id === catId || g.children.some((c) => c.id === catId)) ?? null;
  const activeName =
    catId == null
      ? null
      : (activeGroup?.id === catId
          ? activeGroup?.name
          : activeGroup?.children.find((c) => c.id === catId)?.name) ??
        params.get("name") ??
        "Category";

  const debouncedQ = useDebounced(query.trim(), 350);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProductCardData[]>([]);

  // New search/category → start over from page 1
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [debouncedQ, catId]);

  const results = trpc.catalog.list.useQuery({
    query: debouncedQ || undefined,
    categoryId: debouncedQ ? undefined : (catId ?? undefined),
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

  function pickCategory(id: number | null) {
    setQuery("");
    setCatId((prev) => (prev === id ? null : id));
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
            if (e.target.value) setCatId(null);
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

      {/* Top-group chips — the store's real departments */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {groups.map((g) => {
          const active = activeGroup?.id === g.id;
          return (
            <button
              key={g.id}
              onClick={() => pickCategory(g.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium border-[1.5px] transition ${
                active
                  ? "bg-gbs-red border-gbs-red text-white"
                  : "border-gbs-gray-300 text-gbs-gray-700 hover:border-gbs-red hover:text-gbs-red"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {/* Subcategory chips for the active group */}
      {activeGroup && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          {activeGroup.children.map((c) => {
            const active = catId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition ${
                  active
                    ? "bg-gbs-black border-gbs-black text-white"
                    : "border-gbs-gray-300 text-gbs-gray-500 hover:border-gbs-black hover:text-gbs-black"
                }`}
              >
                {c.name}
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
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
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
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => pickCategory(g.id)}
                className="rounded-full border-[1.5px] border-gbs-gray-300 px-3.5 py-1.5 text-[13px] font-medium text-gbs-gray-700 hover:border-gbs-red hover:text-gbs-red transition"
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

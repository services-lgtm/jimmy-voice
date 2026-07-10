/**
 * Homepage hero — "Find It. Order It. Build It." with a giant live search bar.
 * Ported from the loved Manus design, rebuilt in GBS red/black.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Package, Search, TrendingUp, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

const PLACEHOLDERS = [
  "Search for R-19 insulation...",
  'Find steel studs 3-5/8"...',
  "Look up drywall 4x8 sheets...",
  "Search OSB sheathing...",
  "Find Simpson joist hangers...",
  "Search Diablo saw blades...",
];

const TRENDING = [
  "Insulation",
  "Steel Studs",
  "Drywall",
  "Lumber",
  "Joist Hangers",
  "OSB",
  "Safety Vest",
  "Saw Blade",
];

function useCountdown(): string {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(14, 0, 0, 0); // 2 PM same-day cutoff
      if (now >= cutoff) cutoff.setDate(cutoff.getDate() + 1);
      const diff = cutoff.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return timeLeft;
}

function useTypewriter(): string {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    const current = PLACEHOLDERS[idx];
    let i = typing ? 0 : current.length;
    let timeout: ReturnType<typeof setTimeout>;
    const step = () => {
      if (typing) {
        if (i <= current.length) {
          setText(current.slice(0, i));
          i++;
          timeout = setTimeout(step, 45);
        } else {
          timeout = setTimeout(() => setTyping(false), 1800);
        }
      } else {
        if (i >= 0) {
          setText(current.slice(0, i));
          i--;
          timeout = setTimeout(step, 22);
        } else {
          setIdx((p) => (p + 1) % PLACEHOLDERS.length);
          setTyping(true);
        }
      }
    };
    step();
    return () => clearTimeout(timeout);
  }, [idx, typing]);
  return text;
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function HeroSearch() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const typed = useTypewriter();
  const countdown = useCountdown();
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = trpc.catalog.stats.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const debouncedQ = useDebounced(query.trim(), 300);
  const live = trpc.catalog.list.useQuery(
    { query: debouncedQ, limit: 6 },
    { enabled: debouncedQ.length >= 2 },
  );

  const products = debouncedQ.length >= 2 ? (live.data?.products ?? []) : [];
  const showDropdown = focused && query.trim().length >= 2;
  const showTrending = focused && query.trim().length === 0;

  const goSearch = (term?: string) => {
    const t = (term ?? query).trim();
    if (t) navigate(`/shop?q=${encodeURIComponent(t)}`);
  };

  const statItems = useMemo(
    () => [
      {
        value: stats.data?.products ? `${stats.data.products.toLocaleString()}+` : "5,000+",
        label: "Products",
        mono: false,
      },
      { value: countdown || "—", label: "Order Cutoff", mono: true },
      // Brand count only impresses once there are enough registered brands
      ...(stats.data && stats.data.brands >= 10
        ? [{ value: `${stats.data.brands}+`, label: "Brands", mono: false }]
        : [{ value: "Same-Day", label: "NYC Delivery", mono: false }]),
      {
        value: stats.data?.categories ? String(stats.data.categories) : "19",
        label: "Categories",
        mono: false,
      },
    ],
    [stats.data, countdown],
  );

  return (
    <section id="hero" className="relative overflow-hidden bg-gbs-black">
      {/* Warehouse photo */}
      <div
        className="absolute inset-0 opacity-25 bg-cover bg-center"
        style={{ backgroundImage: "url(/brand/GBS-Forklift.jpg)" }}
      />
      {/* Red grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#E8001D 1px, transparent 1px), linear-gradient(90deg, #E8001D 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[88vh] px-4 py-16">
        {/* Badge */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
          <span className="size-2 rounded-full bg-gbs-success animate-pulse" />
          <span className="font-condensed font-bold uppercase tracking-[0.12em] text-white/80 text-[11px]">
            NYC's contractor supply platform —{" "}
            {(stats.data?.products || 5000).toLocaleString()}+ products in stock
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-condensed font-bold uppercase text-white text-center leading-[0.95] tracking-tight mb-5">
          <span className="block text-5xl sm:text-6xl lg:text-7xl xl:text-8xl">Find It.</span>
          <span className="block text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-gbs-red">
            Order It.
          </span>
          <span className="block text-5xl sm:text-6xl lg:text-7xl xl:text-8xl">Build It.</span>
        </h1>

        <p className="text-white/60 text-lg sm:text-xl text-center max-w-xl mb-10 leading-relaxed">
          The fastest way to source building materials in NYC. From search to jobsite in hours,
          not days.
        </p>

        {/* Giant search bar */}
        <div className="w-full max-w-3xl relative">
          <div
            className={`relative bg-white rounded-2xl transition-shadow duration-300 ${
              focused
                ? "shadow-[0_0_0_3px_rgba(232,0,29,0.35),0_20px_60px_rgba(232,0,29,0.25)]"
                : "shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
            }`}
          >
            <div className="flex items-center">
              {live.isLoading && debouncedQ.length >= 2 ? (
                <div className="absolute left-5 size-[22px] border-2 border-gbs-red border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="absolute left-5 size-[22px] text-gbs-red" strokeWidth={2.5} />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 200)}
                onKeyDown={(e) => e.key === "Enter" && goSearch()}
                placeholder={query ? "" : typed}
                className="w-full pl-14 pr-32 py-5 text-lg text-gbs-black placeholder:text-gbs-gray-500 bg-transparent rounded-2xl focus:outline-none"
              />
              <button
                onClick={() => goSearch()}
                className="absolute right-3 flex items-center gap-2 bg-gbs-red hover:bg-gbs-red-dark text-white px-5 py-3 rounded-xl font-condensed font-bold uppercase tracking-[0.08em] text-sm transition active:scale-95"
              >
                <Zap className="size-[15px]" fill="white" />
                Search
              </button>
            </div>

            {/* Live results */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-xl shadow-2xl border border-gbs-gray-100 mt-2 overflow-hidden z-50">
                {products.length ? (
                  <>
                    {products.map((p) => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gbs-gray-100/60 text-left transition-colors group border-b border-gbs-gray-100 last:border-0"
                        onMouseDown={() => navigate(`/product/${p.id}`)}
                      >
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            className="size-10 object-contain rounded-lg bg-gbs-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="size-10 bg-gbs-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <Package className="size-4 text-gbs-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-gbs-black text-sm font-medium truncate group-hover:text-gbs-red transition-colors">
                            {p.title}
                          </div>
                          {p.sku && (
                            <div className="text-gbs-gray-500 text-[11px] font-mono">
                              SKU {p.sku}
                            </div>
                          )}
                        </div>
                        <span className="font-condensed font-bold text-gbs-black text-sm shrink-0">
                          ${p.price}
                        </span>
                      </button>
                    ))}
                    <button
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gbs-gray-100 hover:bg-gbs-red-tint text-gbs-red font-condensed font-bold uppercase tracking-[0.08em] text-sm transition-colors"
                      onMouseDown={() => goSearch()}
                    >
                      View all results for “{query.trim()}”
                      <ArrowRight className="size-3.5" />
                    </button>
                  </>
                ) : !live.isLoading ? (
                  <div className="px-5 py-4 text-gbs-gray-500 text-sm text-center">
                    No products found for “{query.trim()}”
                  </div>
                ) : (
                  <div className="px-5 py-4 text-gbs-gray-500 text-sm text-center">Searching...</div>
                )}
              </div>
            )}

            {/* Trending */}
            {showTrending && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-xl shadow-2xl border border-gbs-gray-100 mt-2 overflow-hidden z-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="size-[13px] text-gbs-red" />
                  <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-gray-500 text-[10px]">
                    Popular searches
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map((t) => (
                    <button
                      key={t}
                      className="text-sm text-gbs-red bg-gbs-red-tint hover:bg-gbs-red hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                      onMouseDown={() => goSearch(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center gap-8 mt-14 text-center">
          {statItems.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span
                className={
                  stat.mono
                    ? "font-mono font-semibold text-white text-xl sm:text-2xl"
                    : "font-condensed font-bold text-white text-3xl sm:text-4xl"
                }
              >
                {stat.value}
              </span>
              <span className="font-condensed font-bold uppercase tracking-[0.12em] text-white/40 text-[10px] mt-0.5">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}

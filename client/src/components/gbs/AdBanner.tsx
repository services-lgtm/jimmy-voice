/**
 * Sponsored banner slot. Fetches banners for a slot and rotates between them
 * (one shown per page view). Clearly labeled SPONSORED.
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

const THEMES = {
  dark: {
    wrap: "bg-gbs-charcoal border-white/10",
    title: "text-white",
    subtitle: "text-white/60",
    cta: "bg-gbs-red hover:bg-gbs-red-dark text-white shadow-red",
    tag: "bg-white/10 text-white/60",
  },
  red: {
    wrap: "bg-gbs-red border-gbs-red-dark",
    title: "text-white",
    subtitle: "text-white/80",
    cta: "bg-white text-gbs-red hover:bg-gbs-gray-100",
    tag: "bg-white/20 text-white/90",
  },
  light: {
    wrap: "bg-white border-gbs-gray-100 shadow-sm",
    title: "text-gbs-black",
    subtitle: "text-gbs-gray-700",
    cta: "bg-gbs-red hover:bg-gbs-red-dark text-white shadow-red",
    tag: "bg-gbs-gray-100 text-gbs-gray-500",
  },
} as const;

export default function AdBanner({
  slot,
  compact = false,
}: {
  slot: "home-mid" | "home-lower" | "shop-grid" | "product-below";
  compact?: boolean;
}) {
  const { data } = trpc.ads.list.useQuery({ slot }, { staleTime: 5 * 60 * 1000 });
  // Stable random pick per mount so rotation varies between page views
  const seed = useMemo(() => Math.random(), []);
  const banners = data?.banners ?? [];
  if (!banners.length) return null;
  const b = banners[Math.floor(seed * banners.length)];
  const t = THEMES[b.theme] ?? THEMES.dark;

  const inner = (
    <div
      className={`relative rounded-2xl border overflow-hidden ${t.wrap} ${
        compact ? "p-4" : "p-6 md:p-7"
      } flex items-center gap-4 group cursor-pointer transition hover:opacity-95`}
    >
      {b.image && (
        <img
          src={b.image}
          alt=""
          className={`${compact ? "size-14" : "size-20"} rounded-lg object-cover shrink-0`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`font-condensed font-bold uppercase tracking-[0.12em] text-[9px] rounded px-1.5 py-0.5 ${t.tag}`}
          >
            Sponsored
          </span>
          <span className={`text-[11px] truncate ${t.subtitle}`}>{b.sponsor}</span>
        </div>
        <div
          className={`font-condensed font-bold leading-tight ${t.title} ${
            compact ? "text-base" : "text-xl md:text-2xl"
          }`}
        >
          {b.title}
        </div>
        {b.subtitle && !compact && (
          <div className={`mt-1 text-sm ${t.subtitle}`}>{b.subtitle}</div>
        )}
      </div>
      <span
        className={`shrink-0 hidden sm:inline-flex items-center gap-1.5 rounded-md font-condensed font-bold uppercase tracking-[0.08em] text-xs px-4 py-2.5 ${t.cta} group-hover:translate-x-0.5 transition-transform`}
      >
        {b.cta}
        <ArrowRight className="size-3.5" />
      </span>
    </div>
  );

  return b.href.startsWith("/") ? (
    <Link href={b.href} className="block">
      {inner}
    </Link>
  ) : (
    <a href={b.href} target="_blank" rel="noreferrer sponsored" className="block">
      {inner}
    </a>
  );
}

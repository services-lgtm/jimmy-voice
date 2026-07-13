/**
 * GBS homepage — the "construction operating system" layout in GBS brand.
 *
 * Section order:
 *  1. Giant smart-search hero
 *  2. Meet Jimmy (AI assistant)
 *  3. Shop by Project (one-click real material lists)
 *  4. Shop by Category (live store tree)
 *  5. Same-Day Picks (live products)
 *  6. Contractor benefits
 *  7. Delivery network
 *  8. Knowledge center
 *  9. Trust
 *  + floating Speed Bar after the hero
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { categoryStyle } from "@/lib/gbs";
import ProductCard from "@/components/gbs/ProductCard";
import AdBanner from "@/components/gbs/AdBanner";
import HeroSearch from "@/components/gbs/home/HeroSearch";
import MeetJimmy from "@/components/gbs/home/MeetJimmy";
import ShopByProject from "@/components/gbs/home/ShopByProject";
import ContractorSection from "@/components/gbs/home/ContractorSection";
import DeliveryZones from "@/components/gbs/home/DeliveryZones";
import KnowledgeCenter from "@/components/gbs/home/KnowledgeCenter";
import TrustSection from "@/components/gbs/home/TrustSection";
import SpeedBar from "@/components/gbs/home/SpeedBar";

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function HomePage() {
  useScrollReveal();
  const featured = trpc.catalog.list.useQuery({ limit: 8 });
  const categories = trpc.catalog.categories.useQuery();
  const tiles = categories.data?.groups ?? [];

  return (
    <div>
      <HeroSearch />

      <div className="fade-up">
        <MeetJimmy />
      </div>

      <div className="fade-up">
        <ShopByProject />
      </div>

      {/* Sponsored slot */}
      <section className="container mt-8 fade-up">
        <AdBanner slot="home-mid" />
      </section>

      {/* Shop by category — live from the store's real tree */}
      <section className="py-16 bg-white fade-up">
        <div className="container">
          <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
            Shop by category
          </span>
          <h2 className="font-condensed font-bold text-3xl sm:text-4xl text-gbs-black mb-8">
            Every trade. One supplier.
          </h2>
          {categories.isLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="size-28 shrink-0 rounded-xl bg-gbs-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {tiles.map((c) => {
                const s = categoryStyle(c.name);
                return (
                  <Link
                    key={c.id}
                    href={`/shop?cat=${c.id}&name=${encodeURIComponent(c.name)}`}
                    className="w-28 shrink-0 bg-white rounded-xl border border-gbs-gray-100 shadow-sm aspect-square flex flex-col items-center justify-center gap-2 px-2 hover:border-gbs-red active:scale-[0.98] transition"
                  >
                    <span
                      className="size-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: s.tint }}
                    >
                      <s.icon className="size-5" style={{ color: s.color }} />
                    </span>
                    <span className="text-xs font-semibold text-gbs-black text-center leading-tight line-clamp-2">
                      {c.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Same-day picks — live products */}
      <section className="py-16 bg-gbs-gray-100/50 fade-up">
        <div className="container">
          <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
            Same-day picks
          </span>
          <h2 className="font-condensed font-bold text-3xl sm:text-4xl text-gbs-black mb-8">
            On the truck by this afternoon.
          </h2>
          {featured.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-gbs-gray-100 aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(featured.data?.products ?? []).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="fade-up">
        <ContractorSection />
      </div>

      <div className="fade-up">
        <DeliveryZones />
      </div>

      {/* Sponsored slot */}
      <section className="container my-8 fade-up">
        <AdBanner slot="home-lower" />
      </section>

      <div className="fade-up">
        <KnowledgeCenter />
      </div>

      <div className="fade-up">
        <TrustSection />
      </div>

      <SpeedBar />
    </div>
  );
}

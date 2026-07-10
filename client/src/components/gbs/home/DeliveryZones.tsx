/**
 * Delivery network — zones + stats, ported from the old East Coast map section.
 */
import { useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { useLocation } from "wouter";

const ZONES = [
  {
    id: "nyc",
    name: "New York City",
    areas: "Brooklyn, Queens, Manhattan, Bronx, Staten Island",
    delivery: "Same Day",
    cutoff: "2:00 PM",
    color: "#E8001D",
  },
  {
    id: "tri-state",
    name: "Tri-State Area",
    areas: "Long Island, NJ, CT",
    delivery: "Next Day",
    cutoff: "12:00 PM",
    color: "#FF1A35",
  },
  {
    id: "northeast",
    name: "Northeast Corridor",
    areas: "PA, MA, RI, NH, VT, ME",
    delivery: "1–2 Days",
    cutoff: "10:00 AM",
    color: "#D97706",
  },
  {
    id: "mid-atlantic",
    name: "Mid-Atlantic",
    areas: "MD, DE, VA, DC",
    delivery: "2–3 Days",
    cutoff: "10:00 AM",
    color: "#888888",
  },
];

const STATS = [
  { value: "Same-Day", label: "NYC Delivery" },
  { value: "2 PM", label: "Order Cutoff" },
  { value: "14 States", label: "Coverage Area" },
  { value: "24/7", label: "Order Processing" },
];

export default function DeliveryZones() {
  const [, navigate] = useLocation();
  const [activeId, setActiveId] = useState("nyc");
  const active = ZONES.find((z) => z.id === activeId)!;

  return (
    <section className="py-20 bg-gbs-black" id="delivery">
      <div className="container">
        <div className="flex flex-col lg:flex-row items-start justify-between mb-12 gap-6">
          <div>
            <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
              East Coast delivery network
            </span>
            <h2 className="font-condensed font-bold text-4xl sm:text-5xl text-white leading-tight">
              Order today.
              <br />
              <span className="text-gbs-red">On your site tomorrow.</span>
            </h2>
            <p className="text-white/50 mt-3 max-w-lg">
              Our distribution network delivers faster than any building supply company on the
              East Coast.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center min-w-36"
              >
                <div className="font-condensed font-bold text-white text-2xl sm:text-3xl">
                  {stat.value}
                </div>
                <div className="font-condensed font-bold uppercase tracking-[0.12em] text-white/40 text-[10px] mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Active zone spotlight */}
          <div className="relative bg-gbs-charcoal rounded-2xl p-6 overflow-hidden min-h-72">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(#E8001D 1px, transparent 1px), linear-gradient(90deg, #E8001D 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full animate-pulse"
                  style={{ background: active.color }}
                />
                <span className="font-condensed font-bold text-white text-xl">{active.name}</span>
                <span
                  className="ml-auto font-condensed font-bold uppercase tracking-[0.08em] text-[11px] text-white px-2.5 py-1 rounded-full"
                  style={{ background: active.color }}
                >
                  {active.delivery}
                </span>
              </div>
              <div className="mt-2 text-white/60 text-sm">{active.areas}</div>
              <div className="mt-4 flex items-center gap-2 text-white/50 text-sm">
                <Clock className="size-4" />
                Order by {active.cutoff} for {active.delivery.toLowerCase()} delivery
              </div>
              <div className="mt-8 p-4 bg-gbs-red/10 border border-gbs-red/30 rounded-xl">
                <div className="font-condensed font-bold text-white text-sm mb-2">
                  Check your delivery window
                </div>
                <button
                  onClick={() => navigate("/jimmy?q=What's the delivery time to my zip code?")}
                  className="w-full flex items-center justify-center gap-2 bg-gbs-red hover:bg-gbs-red-dark text-white py-2.5 rounded-lg font-condensed font-bold uppercase tracking-[0.08em] text-sm transition active:scale-[0.97]"
                >
                  <MapPin className="size-4" />
                  Ask about your zip code
                </button>
              </div>
            </div>
          </div>

          {/* Zone list */}
          <div className="flex flex-col gap-3">
            {ZONES.map((zone) => (
              <button
                key={zone.id}
                onClick={() => setActiveId(zone.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  activeId === zone.id
                    ? "bg-white/10 border-white/25"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: zone.color }} />
                    <span className="font-condensed font-bold text-white text-sm">{zone.name}</span>
                  </div>
                  <span
                    className="font-condensed font-bold uppercase tracking-[0.08em] text-[10px] px-2.5 py-1 rounded-full"
                    style={{ background: `${zone.color}30`, color: zone.color }}
                  >
                    {zone.delivery}
                  </span>
                </div>
                <div className="text-white/50 text-xs">{zone.areas}</div>
                <div className="flex items-center gap-1.5 text-white/40 text-xs mt-1.5">
                  <Clock className="size-3" />
                  Order by {zone.cutoff}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

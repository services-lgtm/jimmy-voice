/**
 * Trust section — testimonials, stats, brands carried.
 */
import { Quote, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    title: "General Contractor, Brooklyn NY",
    text: "Same-day delivery to my jobsite is a game changer. No more running to the supply house mid-project.",
    avatar: "MT",
    color: "#E8001D",
  },
  {
    name: "Sarah K.",
    title: "Renovation Contractor, Long Island",
    text: "Jimmy AI saved me 2 hours on my last estimate. I described the project and got a complete materials list with pricing.",
    avatar: "SK",
    color: "#16A34A",
  },
  {
    name: "David R.",
    title: "Commercial Builder, NJ",
    text: "Trade pricing is real — I'm saving serious money vs the big box stores. Bulk ordering is seamless for commercial jobs.",
    avatar: "DR",
    color: "#D97706",
  },
];

const STATS = [
  { value: "Same-Day", label: "NYC Delivery" },
  { value: "5,000+", label: "Products in Stock" },
  { value: "$0", label: "Surprise Fees" },
  { value: "30-Day", label: "Return Policy" },
];

const BRANDS = [
  "Owens Corning",
  "Rockwool",
  "Simpson Strong-Tie",
  "USG",
  "Diablo",
  "Portwest",
  "Little Giant",
  "Grip-Rite",
];

export default function TrustSection() {
  return (
    <section className="py-20 bg-white" id="trust">
      <div className="container">
        <div className="text-center mb-14">
          <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
            Trusted by professionals
          </span>
          <h2 className="font-condensed font-bold text-4xl sm:text-5xl text-gbs-black leading-tight max-w-2xl mx-auto">
            Built on trust.
            <br />
            <span className="text-gbs-red">Proven by results.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-6 bg-gbs-gray-100/70 rounded-2xl border border-gbs-gray-100"
            >
              <div className="font-condensed font-bold text-3xl sm:text-4xl text-gbs-black mb-1">
                {stat.value}
              </div>
              <div className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-gray-500 text-[11px]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-14">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-gbs-gray-100/70 border border-gbs-gray-100 rounded-2xl p-6"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 text-gbs-warning fill-gbs-warning" />
                ))}
              </div>
              <Quote className="size-5 text-gbs-red/30 mb-3" />
              <p className="text-gbs-gray-900 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="size-9 rounded-full flex items-center justify-center text-white text-xs font-condensed font-bold shrink-0"
                  style={{ background: t.color }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="font-condensed font-bold text-gbs-black text-sm">{t.name}</div>
                  <div className="text-gbs-gray-500 text-xs">{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-gray-500 text-[11px] mb-6">
            Brands we carry
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {BRANDS.map((brand) => (
              <div
                key={brand}
                className="px-5 py-2.5 bg-gbs-gray-100/70 border border-gbs-gray-100 rounded-full text-sm text-gbs-gray-700 font-medium"
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * "Advertise with GBS" — the sales page for banner sponsors:
 * product brands and local contractors who want GBS customers.
 */
import { ArrowRight, BarChart3, MapPin, Megaphone, Package } from "lucide-react";

const CONTACT = "sales@gobuildd.com";

const OPTIONS = [
  {
    icon: Package,
    title: "Brand & product banners",
    body: "Feature your product line on the GBS homepage, search results, and product pages — seen by contractors while they're speccing and buying.",
  },
  {
    icon: MapPin,
    title: "Contractor Spotlight",
    body: "Licensed plumber, electrician, or GC? Get featured to homeowners and builders ordering materials in your area.",
  },
  {
    icon: BarChart3,
    title: "Category sponsorship",
    body: "Own a category — your banner on every Drywall, Lumber, or Electrical page, plus priority placement in related searches.",
  },
];

export default function AdvertisePage() {
  const mailto = `mailto:${CONTACT}?subject=${encodeURIComponent("Advertising on gobuildsupply.com")}`;

  return (
    <div className="container max-w-3xl py-10">
      <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
        GBS Media
      </span>
      <h1 className="font-condensed font-bold text-4xl sm:text-5xl text-gbs-black leading-tight">
        Advertise where contractors
        <br />
        <span className="text-gbs-red">actually buy.</span>
      </h1>
      <p className="mt-4 text-gbs-gray-700 max-w-xl">
        GBS is NYC's contractor supply platform — 5,000+ products, same-day jobsite delivery, and
        an AI assistant contractors use to spec entire jobs. Put your brand or your crew in front
        of them at the moment of purchase.
      </p>

      <div className="mt-10 grid sm:grid-cols-3 gap-4">
        {OPTIONS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-white border border-gbs-gray-100 rounded-2xl p-5 shadow-sm">
            <span className="size-10 rounded-lg bg-gbs-red-tint flex items-center justify-center">
              <Icon className="size-5 text-gbs-red" />
            </span>
            <h3 className="mt-3 font-condensed font-bold text-lg text-gbs-black leading-tight">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-gbs-gray-700 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-gbs-charcoal rounded-2xl p-7 border-l-[3px] border-gbs-red">
        <div className="flex items-center gap-2">
          <Megaphone className="size-5 text-gbs-red" />
          <h2 className="font-condensed font-bold text-2xl text-white">Get a spot</h2>
        </div>
        <p className="mt-2 text-sm text-gbs-gray-500 max-w-md">
          Placements are limited per page and sold directly — no ad networks, no clutter. Tell us
          what you sell or what trade you're in, and we'll send options and pricing.
        </p>
        <a
          href={mailto}
          className="mt-5 inline-flex items-center gap-2 h-12 px-6 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] transition"
        >
          Email {CONTACT}
          <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  );
}

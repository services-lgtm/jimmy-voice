/**
 * server/routers/ads.ts
 * Sponsored banners for the website (and later the app — same endpoint).
 *
 * To sell/replace a banner: edit BANNERS below and redeploy. Each slot can
 * hold several banners; clients rotate through them. Keep the "advertise"
 * self-promo entries until a paying sponsor takes the spot.
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

export type AdBanner = {
  id: string;
  slot: "home-mid" | "home-lower" | "shop-grid" | "product-below";
  sponsor: string; // shown next to the SPONSORED tag
  title: string;
  subtitle?: string;
  cta: string;
  href: string; // internal path ("/shop?q=...") or external URL
  image?: string; // optional image URL (left side)
  theme: "dark" | "red" | "light";
  active: boolean;
};

const BANNERS: AdBanner[] = [
  // ── Homepage, between Shop-by-Project and Categories ──
  {
    id: "gold-bond-demo",
    slot: "home-mid",
    sponsor: "Gold Bond Building Products",
    title: "Gold Bond XP® — mold-resistant drywall, in stock now",
    subtitle: "Same-day delivery on 5/8\" Hi-Impact and XP boards across NYC.",
    cta: "Shop Gold Bond",
    href: "/shop?q=gold%20bond",
    theme: "dark",
    active: true,
  },
  {
    id: "advertise-home",
    slot: "home-mid",
    sponsor: "GBS Media",
    title: "Put your brand in front of NYC contractors",
    subtitle: "Thousands of pros browse GBS to spec and order materials. This spot could be yours.",
    cta: "Advertise with GBS",
    href: "/advertise",
    theme: "red",
    active: true,
  },

  // ── Homepage, lower (before Knowledge Center) ──
  {
    id: "contractor-spotlight-demo",
    slot: "home-lower",
    sponsor: "Contractor Spotlight",
    title: "Licensed electrician in Brooklyn? Get found by GBS customers",
    subtitle: "Feature your crew to homeowners and GCs ordering materials in your area.",
    cta: "Claim your spotlight",
    href: "/advertise",
    theme: "light",
    active: true,
  },

  // ── Shop page, inline in the product grid ──
  {
    id: "advertise-shop",
    slot: "shop-grid",
    sponsor: "GBS Media",
    title: "Your product could be here",
    subtitle: "Sponsored placement inside search results.",
    cta: "Advertise",
    href: "/advertise",
    theme: "dark",
    active: true,
  },

  // ── Product page, below related products ──
  {
    id: "advertise-product",
    slot: "product-below",
    sponsor: "GBS Media",
    title: "Reach contractors at the moment they're buying",
    subtitle: "Banner placements on product pages — by category or storewide.",
    cta: "Advertise with GBS",
    href: "/advertise",
    theme: "red",
    active: true,
  },
];

export const adsRouter = router({
  list: publicProcedure
    .input(z.object({ slot: z.string().max(40) }))
    .query(({ input }) => ({
      banners: BANNERS.filter((b) => b.active && b.slot === input.slot),
    })),
});

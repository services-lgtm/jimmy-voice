/**
 * GBS brand data — category styling, quick-tap chips, shared bits.
 * Categories come LIVE from the BigCommerce store (catalog.categories);
 * this file only decides which icon/color each real category gets.
 */
import {
  Boxes,
  DoorOpen,
  Droplet,
  Droplets,
  Fan,
  Hammer,
  HardHat,
  Home,
  Layers,
  LayoutGrid,
  Package,
  Paintbrush,
  Ruler,
  ShieldCheck,
  Trees,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type CategoryStyle = { icon: LucideIcon; color: string; tint: string };

const STYLE_RULES: Array<{ match: RegExp; style: CategoryStyle }> = [
  { match: /drywall/i, style: { icon: Layers, color: "#2563EB", tint: "#EFF6FF" } },
  { match: /lumber|sheet goods/i, style: { icon: Trees, color: "#B45309", tint: "#FFFBEB" } },
  { match: /steel|framing/i, style: { icon: Ruler, color: "#D97706", tint: "#FFF7ED" } },
  { match: /fastener|hardware/i, style: { icon: Hammer, color: "#E8001D", tint: "#FFF0F2" } },
  { match: /insulation/i, style: { icon: ShieldCheck, color: "#16A34A", tint: "#F0FDF4" } },
  { match: /adhesive|sealant|tape/i, style: { icon: Droplet, color: "#DB2777", tint: "#FDF2F8" } },
  { match: /trim|molding|moulding/i, style: { icon: Ruler, color: "#475569", tint: "#F8FAFC" } },
  { match: /paint|finish/i, style: { icon: Paintbrush, color: "#7C3AED", tint: "#F5F3FF" } },
  { match: /plumbing/i, style: { icon: Droplets, color: "#0891B2", tint: "#ECFEFF" } },
  { match: /electric/i, style: { icon: Zap, color: "#CA8A04", tint: "#FEFCE8" } },
  { match: /hvac|ventilation/i, style: { icon: Fan, color: "#0284C7", tint: "#F0F9FF" } },
  { match: /roof/i, style: { icon: Home, color: "#475569", tint: "#F8FAFC" } },
  { match: /door|window/i, style: { icon: DoorOpen, color: "#92400E", tint: "#FEF3C7" } },
  { match: /concrete|masonry/i, style: { icon: Boxes, color: "#57534E", tint: "#F5F5F4" } },
  { match: /floor|tile/i, style: { icon: LayoutGrid, color: "#0E7490", tint: "#ECFEFF" } },
  { match: /tool|equipment/i, style: { icon: Wrench, color: "#111111", tint: "#F5F5F5" } },
  { match: /safety|ppe/i, style: { icon: HardHat, color: "#EA580C", tint: "#FFF7ED" } },
];

const DEFAULT_STYLE: CategoryStyle = { icon: Package, color: "#555555", tint: "#F5F5F5" };

export function categoryStyle(name: string): CategoryStyle {
  return STYLE_RULES.find((r) => r.match.test(name))?.style ?? DEFAULT_STYLE;
}

export const JIMMY_CHIPS = [
  "Frame a room",
  "Wire a kitchen",
  "Tile a bathroom",
  "Pour a slab",
  "Hang drywall",
  "Install insulation",
];

export const STORE_URL = "https://gobuildsupply.com";

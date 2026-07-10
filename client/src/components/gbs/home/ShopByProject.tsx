/**
 * Shop by Project — the killer section from the old design, now REAL:
 * each card carries a material spec list; "Shop List" builds a live cart
 * from the actual catalog (same engine Jimmy uses) and adds it in one click.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Clock, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";

type Spec = { name: string; quantity: number; unit: string; category: string; searchQuery: string };

type Project = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  avgTime: string;
  tags: string[];
  accent: string;
  popular: boolean;
  materials: Spec[];
};

const PROJECTS: Project[] = [
  {
    id: "basement-finishing",
    emoji: "🏠",
    title: "Basement Finishing",
    description: "Complete insulation, framing, drywall, and finishing package",
    avgTime: "Same-day",
    tags: ["Insulation", "Steel Framing", "Drywall"],
    accent: "#E8001D",
    popular: true,
    materials: [
      { name: "fiberglass insulation", quantity: 10, unit: "rolls", category: "insulation", searchQuery: "fiberglass insulation" },
      { name: "steel studs", quantity: 40, unit: "pieces", category: "framing", searchQuery: "3-5/8 steel stud" },
      { name: "steel track", quantity: 12, unit: "pieces", category: "framing", searchQuery: "3-5/8 track" },
      { name: "drywall sheets", quantity: 30, unit: "sheets", category: "drywall", searchQuery: "1/2 gypsum board 4x8" },
      { name: "drywall screws", quantity: 2, unit: "boxes", category: "fasteners", searchQuery: "drywall screws" },
      { name: "joint compound", quantity: 3, unit: "buckets", category: "drywall", searchQuery: "joint compound" },
      { name: "drywall tape", quantity: 2, unit: "rolls", category: "drywall", searchQuery: "drywall tape" },
    ],
  },
  {
    id: "bathroom-reno",
    emoji: "🚿",
    title: "Bathroom Renovation",
    description: "Cement board, waterproofing, tile backer, and hardware",
    avgTime: "Next day",
    tags: ["Cement Board", "Waterproofing", "Hardware"],
    accent: "#0891B2",
    popular: false,
    materials: [
      { name: "cement board", quantity: 6, unit: "sheets", category: "drywall", searchQuery: "cement board" },
      { name: "cement board screws", quantity: 1, unit: "box", category: "fasteners", searchQuery: "cement board screws" },
      { name: "waterproofing membrane", quantity: 1, unit: "roll", category: "drywall", searchQuery: "waterproofing membrane" },
      { name: "thinset mortar", quantity: 2, unit: "bags", category: "masonry", searchQuery: "thinset mortar" },
      { name: "plumbers putty", quantity: 1, unit: "each", category: "plumbing", searchQuery: "plumbers putty" },
      { name: "silicone sealant", quantity: 2, unit: "tubes", category: "adhesives", searchQuery: "silicone sealant" },
    ],
  },
  {
    id: "new-construction-framing",
    emoji: "🏗️",
    title: "New Construction Framing",
    description: "Lumber, steel studs, tracks, connectors, and fasteners",
    avgTime: "Same-day",
    tags: ["Lumber", "Steel Studs", "Connectors"],
    accent: "#D97706",
    popular: true,
    materials: [
      { name: "2x4 lumber", quantity: 60, unit: "pieces", category: "framing", searchQuery: "2x4 lumber" },
      { name: "OSB sheathing", quantity: 20, unit: "sheets", category: "framing", searchQuery: "osb sheathing" },
      { name: "steel studs", quantity: 50, unit: "pieces", category: "framing", searchQuery: "3-5/8 steel stud" },
      { name: "joist hangers", quantity: 24, unit: "pieces", category: "hardware", searchQuery: "joist hanger" },
      { name: "framing nails", quantity: 2, unit: "boxes", category: "fasteners", searchQuery: "framing nails" },
      { name: "construction screws", quantity: 2, unit: "boxes", category: "fasteners", searchQuery: "construction screws" },
    ],
  },
  {
    id: "roof-replacement",
    emoji: "🏡",
    title: "Roof Replacement",
    description: "OSB sheathing, underlayment, flashing, and roofing materials",
    avgTime: "Next day",
    tags: ["OSB", "Underlayment", "Flashing"],
    accent: "#475569",
    popular: false,
    materials: [
      { name: "OSB sheathing", quantity: 15, unit: "sheets", category: "roofing", searchQuery: "osb sheathing" },
      { name: "roof underlayment", quantity: 3, unit: "rolls", category: "roofing", searchQuery: "roof underlayment" },
      { name: "drip edge", quantity: 10, unit: "pieces", category: "roofing", searchQuery: "drip edge" },
      { name: "roofing nails", quantity: 2, unit: "boxes", category: "fasteners", searchQuery: "roofing nails" },
      { name: "flashing", quantity: 4, unit: "pieces", category: "roofing", searchQuery: "roof flashing" },
    ],
  },
  {
    id: "commercial-office",
    emoji: "🏢",
    title: "Commercial Office Build-Out",
    description: "Steel framing, acoustic ceiling, drywall, and electrical rough-in",
    avgTime: "Scheduled",
    tags: ["Steel Framing", "Acoustic", "Drywall"],
    accent: "#E8001D",
    popular: true,
    materials: [
      { name: "steel studs", quantity: 80, unit: "pieces", category: "framing", searchQuery: "3-5/8 steel stud" },
      { name: "steel track", quantity: 24, unit: "pieces", category: "framing", searchQuery: "3-5/8 track" },
      { name: "drywall sheets", quantity: 60, unit: "sheets", category: "drywall", searchQuery: "5/8 gypsum board" },
      { name: "acoustic sealant", quantity: 6, unit: "tubes", category: "adhesives", searchQuery: "acoustical sealant" },
      { name: "electrical boxes", quantity: 20, unit: "pieces", category: "electrical", searchQuery: "electrical box" },
      { name: "mc cable", quantity: 2, unit: "rolls", category: "electrical", searchQuery: "mc cable" },
    ],
  },
  {
    id: "deck-build",
    emoji: "🌿",
    title: "Deck & Outdoor Build",
    description: "Pressure treated lumber, hardware, fasteners, and decking",
    avgTime: "Next day",
    tags: ["PT Lumber", "Hardware", "Decking"],
    accent: "#16A34A",
    popular: false,
    materials: [
      { name: "pressure treated deck boards", quantity: 40, unit: "pieces", category: "lumber", searchQuery: "treated deck board" },
      { name: "pressure treated 2x8", quantity: 16, unit: "pieces", category: "lumber", searchQuery: "treated 2x8 lumber" },
      { name: "joist hangers", quantity: 20, unit: "pieces", category: "hardware", searchQuery: "joist hanger" },
      { name: "post base", quantity: 6, unit: "pieces", category: "hardware", searchQuery: "post base" },
      { name: "deck screws", quantity: 2, unit: "boxes", category: "fasteners", searchQuery: "deck screws" },
    ],
  },
];

export default function ShopByProject() {
  const [, navigate] = useLocation();
  const { add } = useCart();
  const buildCart = trpc.cart.buildCart.useMutation();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function shopList(project: Project) {
    if (loadingId) return;
    setLoadingId(project.id);
    try {
      const res = await buildCart.mutateAsync({ materials: project.materials });
      if (!res.cartItems.length) {
        toast.info("Couldn't match this list to the catalog — ask Jimmy instead.");
        navigate(`/jimmy?q=${encodeURIComponent(`Build me a materials list for: ${project.title}`)}`);
        return;
      }
      for (const line of res.cartItems) {
        add(
          {
            id: line.product.id,
            title: line.product.title,
            price: line.product.price,
            image: line.product.image,
            url: line.product.url,
            sku: line.product.sku,
          },
          line.quantity,
        );
      }
      toast.success(`${project.title} list added`, {
        description: `${res.cartItems.length} items · est. $${res.estimatedTotal}`,
      });
      navigate("/cart");
    } catch {
      toast.error("Couldn't build that list right now. Try again.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="py-20 bg-gbs-black" id="shop-by-project">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
          <div>
            <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
              Shop by project
            </span>
            <h2 className="font-condensed font-bold text-4xl sm:text-5xl text-white leading-tight">
              Build faster.
              <br />
              <span className="text-gbs-red">Shop smarter.</span>
            </h2>
            <p className="text-white/50 mt-3 max-w-lg">
              Every project comes with a pre-built materials list from the live catalog. Add
              everything to cart in one click.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROJECTS.map((project) => (
            <button
              key={project.id}
              onClick={() => shopList(project)}
              disabled={loadingId !== null}
              className="relative text-left bg-gbs-charcoal hover:bg-gbs-gray-900 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-200 group overflow-hidden disabled:opacity-70"
            >
              {project.popular && (
                <span className="absolute top-4 right-4 font-condensed font-bold uppercase tracking-[0.08em] text-[10px] bg-gbs-red text-white px-2.5 py-1 rounded-full">
                  Popular
                </span>
              )}
              <div
                className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: project.accent }}
              />
              <div className="text-4xl mb-4">{project.emoji}</div>
              <h3 className="font-condensed font-bold text-white text-xl mb-2 leading-tight">
                {project.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed mb-5">{project.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] text-white/60 bg-white/5 border border-white/10 rounded-full px-2.5 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1.5">
                  <Package className="size-[13px]" />
                  {project.materials.length} materials
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-[13px]" />
                  {project.avgTime}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <span className="text-xs text-white/40">Live pricing at checkout</span>
                <span className="flex items-center gap-1.5 text-gbs-red font-condensed font-bold uppercase tracking-[0.08em] text-sm">
                  {loadingId === project.id ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Building...
                    </>
                  ) : (
                    <>
                      Shop List
                      <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

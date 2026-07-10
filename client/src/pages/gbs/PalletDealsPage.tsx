/**
 * Pallet Deals — screen 14. Bulk-quantity presets on real catalog products.
 */
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";

const PALLET_QTY = 48; // typical pallet unit count
const PALLET_DISCOUNT = 0.12; // bulk savings shown on pallet pricing

export default function PalletDealsPage() {
  const { add } = useCart();
  const { data, isLoading } = trpc.catalog.list.useQuery({ limit: 8 });
  const products = data?.products ?? [];

  return (
    <div className="container py-6">
      {/* Hero */}
      <div className="bg-gbs-charcoal rounded-2xl p-6 md:p-10">
        <span className="font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-red">
          Pallet Deals
        </span>
        <h1 className="mt-2 font-condensed font-bold text-3xl md:text-4xl text-white">
          Buy by the pallet. Save big.
        </h1>
        <p className="mt-2 text-sm text-gbs-gray-500 max-w-md">
          Bulk pricing on the materials you burn through every week. Same-day delivery straight to
          the jobsite.
        </p>
        <Link
          href="/jimmy?q=What pallet deals make sense for my jobs"
          className="mt-4 inline-flex items-center gap-2 text-white text-sm font-medium hover:text-gbs-red transition"
        >
          <Sparkles className="size-4 text-gbs-red" />
          Ask Jimmy which pallet fits your job
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Pallet cards */}
      {isLoading ? (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gbs-gray-100 h-40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {products.map((p) => {
            const unit = parseFloat(p.price) || 0;
            const palletUnit = unit * (1 - PALLET_DISCOUNT);
            const palletTotal = palletUnit * PALLET_QTY;
            return (
              <div
                key={p.id}
                className="flex gap-4 bg-white border border-gbs-gray-100 rounded-xl shadow-sm p-4"
              >
                <div className="relative size-28 w-28 h-28 rounded-lg bg-gbs-gray-100 shrink-0 overflow-hidden">
                  {p.image && (
                    <img src={p.image} alt={p.title} className="w-full h-full object-contain" />
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-gbs-red text-white font-condensed font-bold text-[10px] uppercase tracking-[0.08em] rounded px-1.5 py-0.5">
                    Pallet Deal
                  </span>
                </div>
                <div className="min-w-0 flex-1 flex flex-col">
                  <div className="text-[13px] font-medium text-gbs-black line-clamp-2">{p.title}</div>
                  <div className="mt-1 text-xs text-gbs-gray-500">
                    Pallet of {PALLET_QTY} ·{" "}
                    <span className="line-through">${unit.toFixed(2)}/unit</span>{" "}
                    <span className="text-gbs-red font-semibold">${palletUnit.toFixed(2)}/unit</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-condensed font-bold text-xl text-gbs-black">
                      ${palletTotal.toFixed(2)}
                    </span>
                    <span className="bg-gbs-red text-white font-condensed font-bold text-[10px] uppercase tracking-[0.08em] rounded px-1.5 py-0.5">
                      Save {Math.round(PALLET_DISCOUNT * 100)}%
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      add(p, PALLET_QTY);
                      toast.success("Pallet added to cart", {
                        description: `${PALLET_QTY} × ${p.title}`,
                      });
                    }}
                    className="mt-auto self-start h-9 px-4 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] text-xs shadow-red active:scale-[0.97] transition"
                  >
                    Order pallet
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-gbs-gray-500">
        Pallet pricing shown is introductory and confirmed at checkout.
      </p>
    </div>
  );
}

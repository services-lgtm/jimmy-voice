/**
 * GBS product card — spec 3.3.
 */
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartProduct } from "@/contexts/CartContext";

export type ProductCardData = CartProduct & {
  compare_at_price?: string | null;
  available?: boolean;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const { add } = useCart();
  const price = parseFloat(product.price) || 0;
  const compare = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
  const savePct = compare && compare > price ? Math.round((1 - price / compare) * 100) : null;

  return (
    <div className="relative bg-white rounded-xl border border-gbs-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square bg-gbs-gray-100">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gbs-gray-500 text-xs">
              No image
            </div>
          )}
          <span className="absolute top-2 left-2 bg-gbs-red text-white font-condensed font-bold text-[10px] uppercase tracking-[0.08em] rounded px-1.5 py-0.5">
            Same-Day
          </span>
          {savePct != null && savePct > 0 && (
            <span className="absolute top-2 right-2 bg-gbs-black text-white font-condensed font-bold text-[10px] uppercase tracking-[0.08em] rounded px-1.5 py-0.5">
              Save {savePct}%
            </span>
          )}
        </div>
        <div className="p-3">
          {product.sku && (
            <div className="text-[11px] uppercase tracking-[0.08em] text-gbs-gray-500 font-mono truncate">
              {product.sku}
            </div>
          )}
          <div className="mt-0.5 text-[13px] font-medium text-gbs-black leading-snug line-clamp-2 min-h-9">
            {product.title}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-condensed font-bold text-lg text-gbs-black">
              ${price.toFixed(2)}
            </span>
            {compare && compare > price && (
              <span className="text-xs text-gbs-gray-500 line-through">${compare.toFixed(2)}</span>
            )}
          </div>
        </div>
      </Link>
      <button
        aria-label={`Add ${product.title} to cart`}
        onClick={() => {
          add(product);
          toast.success("Added to cart", { description: product.title });
        }}
        className="absolute bottom-3 right-3 size-8 rounded-full bg-gbs-red text-white shadow-red flex items-center justify-center hover:bg-gbs-red-dark active:scale-95 transition"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

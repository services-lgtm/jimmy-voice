/**
 * Cart — screen 08. Checkout hands the cart to BigCommerce.
 */
import { Link } from "wouter";
import { Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { STORE_URL } from "@/lib/gbs";

export default function CartPage() {
  const { lines, subtotal, setQuantity, remove, clear } = useCart();
  const checkout = trpc.catalog.checkout.useMutation();

  async function handleCheckout() {
    try {
      const res = await checkout.mutateAsync({
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      if (res.url) {
        if (res.skipped > 0) {
          toast.info(`${res.skipped} sample item(s) can't be checked out yet.`);
        }
        window.location.href = res.url;
      } else {
        toast.info("Online checkout isn't live yet — finishing your order on gobuildsupply.com.");
        window.open(STORE_URL, "_blank");
      }
    } catch {
      toast.error("Checkout failed. Please try again.");
    }
  }

  if (!lines.length) {
    return (
      <div className="container py-20 flex flex-col items-center text-center">
        <ShoppingCart className="size-12 text-gbs-gray-300" />
        <h1 className="mt-4 font-condensed font-bold text-2xl text-gbs-black">Your cart is empty</h1>
        <p className="mt-1 text-sm text-gbs-gray-500">Find materials or let Jimmy spec your job.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] transition"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-condensed font-bold text-2xl text-gbs-black">My Cart</h1>
        <button onClick={clear} className="text-sm font-medium text-gbs-red hover:underline">
          Clear all
        </button>
      </div>

      {/* Items */}
      <div className="mt-4 space-y-3">
        {lines.map((l) => (
          <div
            key={l.product.id}
            className="flex items-center gap-3 bg-white border border-gbs-gray-100 rounded-xl shadow-sm p-3"
          >
            <div className="size-15 w-15 h-15 rounded-lg bg-gbs-gray-100 shrink-0 overflow-hidden">
              {l.product.image && (
                <img src={l.product.image} alt="" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${l.product.id}`}
                className="text-[13px] font-medium text-gbs-black line-clamp-2 hover:text-gbs-red"
              >
                {l.product.title}
              </Link>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex items-center border border-gbs-gray-300 rounded-md">
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity(l.product.id, l.quantity - 1)}
                    className="px-2 py-1 text-gbs-black hover:text-gbs-red"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">{l.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => setQuantity(l.product.id, l.quantity + 1)}
                    className="px-2 py-1 text-gbs-black hover:text-gbs-red"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-condensed font-bold text-base text-gbs-black">
                ${((parseFloat(l.product.price) || 0) * l.quantity).toFixed(2)}
              </span>
              <button
                aria-label="Remove item"
                onClick={() => remove(l.product.id)}
                className="text-gbs-red hover:text-gbs-red-dark"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery card */}
      <div className="mt-4 bg-gbs-charcoal rounded-xl p-5">
        <span className="font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-red">
          Delivery
        </span>
        <div className="mt-2 flex items-center gap-2 text-white text-sm">
          <span className="size-2 rounded-full bg-gbs-success" />
          <Truck className="size-4 text-gbs-gray-500" />
          Same-day available — order by 2pm, NYC &amp; surrounding areas
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 bg-white border border-gbs-gray-100 rounded-xl shadow-sm p-5 space-y-2 text-sm">
        <div className="flex justify-between text-gbs-gray-700">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gbs-gray-700">
          <span>Delivery &amp; tax</span>
          <span>Calculated at checkout</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gbs-gray-100 text-gbs-black">
          <span className="font-semibold">Total</span>
          <span className="font-condensed font-bold text-xl">${subtotal.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={checkout.isPending}
        className="mt-4 w-full h-13 py-3.5 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] disabled:opacity-60 transition"
      >
        {checkout.isPending ? "Preparing checkout..." : `Checkout · $${subtotal.toFixed(2)}`}
      </button>
      <p className="mt-2 text-center text-xs text-gbs-gray-500">
        You'll complete payment securely on gobuildsupply.com
      </p>
    </div>
  );
}

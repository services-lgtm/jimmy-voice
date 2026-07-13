/**
 * Product page — screen 05.
 * Gallery, brand, pricing, pallet deal, specs table, description,
 * "contractors also ordered" — all from the live catalog.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ChevronDown, Minus, Plus, Shield, Sparkles, Truck, Package } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import ProductCard from "@/components/gbs/ProductCard";
import AdBanner from "@/components/gbs/AdBanner";

const PALLET_QTY = 48;
const PALLET_DISCOUNT = 0.12;

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [descOpen, setDescOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const { data, isLoading } = trpc.catalog.get.useQuery({ id }, { enabled: Number.isFinite(id) });
  const product = data?.product ?? null;
  const related = data?.related ?? [];

  // Reset gallery/quantity when navigating between products
  useEffect(() => {
    setImgIdx(0);
    setQty(1);
    setDescOpen(false);
  }, [id]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl bg-gbs-gray-100 aspect-square animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gbs-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-6 bg-gbs-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-12 bg-gbs-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <div className="font-condensed font-bold text-2xl text-gbs-black">Product not found</div>
        <Link href="/shop" className="mt-3 inline-block text-gbs-red font-medium">
          Browse products →
        </Link>
      </div>
    );
  }

  const price = parseFloat(product.price) || 0;
  const compare = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
  const images: string[] =
    "images" in product && Array.isArray((product as any).images) && (product as any).images.length
      ? (product as any).images
      : product.image
        ? [product.image]
        : [];
  const brand: string | null = ("brand" in product ? (product as any).brand : null) ?? null;
  const specs: Array<{ label: string; value: string }> =
    ("specs" in product ? (product as any).specs : []) ?? [];
  const upc = specs.find((s) => s.label.toUpperCase() === "UPC")?.value ?? null;
  const palletUnit = price * (1 - PALLET_DISCOUNT);

  return (
    <div className="container py-6">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1.5 text-sm text-gbs-gray-700 hover:text-gbs-red"
      >
        <ArrowLeft className="size-4" />
        All products
      </Link>

      <div className="mt-4 grid md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="relative rounded-xl bg-gbs-gray-100 aspect-square overflow-hidden">
            {images.length ? (
              <img
                src={images[Math.min(imgIdx, images.length - 1)]}
                alt={product.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gbs-gray-500">
                No image
              </div>
            )}
            <span className="absolute top-3 left-3 bg-gbs-red text-white font-condensed font-bold text-[10px] uppercase tracking-[0.08em] rounded px-2 py-0.5">
              Same-Day
            </span>
            {compare && compare > price && (
              <span className="absolute top-3 right-3 bg-gbs-black text-white font-condensed font-bold text-[10px] uppercase tracking-[0.08em] rounded px-2 py-0.5">
                Save {Math.round((1 - price / compare) * 100)}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`size-16 shrink-0 rounded-lg bg-gbs-gray-100 overflow-hidden border-2 transition ${
                    i === imgIdx ? "border-gbs-red" : "border-transparent hover:border-gbs-gray-300"
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {brand && (
            <div className="font-condensed font-bold text-xs uppercase tracking-[0.12em] text-gbs-red">
              {brand}
            </div>
          )}
          <h1 className="mt-1 font-condensed font-bold text-2xl md:text-3xl text-gbs-black leading-tight">
            {product.title}
          </h1>
          {(product.sku || upc) && (
            <div className="mt-2 text-xs text-gbs-gray-500 font-mono">
              {product.sku && <>SKU {product.sku}</>}
              {product.sku && upc && <span className="mx-1.5 text-gbs-gray-300">·</span>}
              {upc && <>UPC {upc}</>}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span
              className={`size-2 rounded-full ${product.available !== false ? "bg-gbs-success" : "bg-gbs-warning"}`}
            />
            <span className={product.available !== false ? "text-gbs-success" : "text-gbs-warning"}>
              {product.available !== false ? "In stock — same-day delivery" : "Check availability"}
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-condensed font-bold text-4xl text-gbs-black">
              ${price.toFixed(2)}
            </span>
            {compare && compare > price && (
              <span className="text-lg text-gbs-gray-500 line-through">${compare.toFixed(2)}</span>
            )}
            <span className="text-sm text-gbs-gray-500">/ each</span>
          </div>

          {/* Quantity + Add to cart */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border-[1.5px] border-gbs-gray-300 rounded-md h-13">
              <button
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3.5 h-full text-gbs-black hover:text-gbs-red"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center font-condensed font-bold text-lg">{qty}</span>
              <button
                aria-label="Increase quantity"
                onClick={() => setQty((q) => q + 1)}
                className="px-3.5 h-full text-gbs-black hover:text-gbs-red"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              onClick={() => {
                add(product, qty);
                toast.success("Added to cart", { description: `${qty} × ${product.title}` });
              }}
              className="flex-1 h-13 py-3.5 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] transition"
            >
              Add to cart
            </button>
          </div>

          {/* Trust icons */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Truck, label: "Same-day delivery" },
              { icon: Package, label: "Pallet pricing available" },
              { icon: Shield, label: "30-day returns" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-lg bg-gbs-gray-100 p-3">
                <Icon className="size-5 mx-auto text-gbs-black" />
                <div className="mt-1.5 text-xs text-gbs-gray-700">{label}</div>
              </div>
            ))}
          </div>

          {/* Pallet deal — dark card, spec 3.6 */}
          <div className="mt-6 bg-gbs-charcoal rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <span className="font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-red">
                Pallet Deal
              </span>
              <div className="mt-1 font-condensed font-bold text-lg text-white">
                Buy {PALLET_QTY} · ${palletUnit.toFixed(2)}/each
              </div>
              <div className="text-xs text-gbs-gray-500">
                ${(palletUnit * PALLET_QTY).toFixed(2)} total ·{" "}
                <span className="text-gbs-red font-semibold">
                  Save {Math.round(PALLET_DISCOUNT * 100)}%
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                add(product, PALLET_QTY);
                toast.success("Pallet added to cart", {
                  description: `${PALLET_QTY} × ${product.title}`,
                });
              }}
              className="shrink-0 h-10 px-4 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] text-xs shadow-red active:scale-[0.97] transition"
            >
              Order pallet
            </button>
          </div>

          {/* Description — from the store catalog */}
          {product.description && (
            <div className="mt-6 border border-gbs-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setDescOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gbs-gray-100/60 transition"
              >
                <span className="font-condensed font-bold text-base text-gbs-black uppercase tracking-[0.08em]">
                  Description
                </span>
                <ChevronDown
                  className={`size-5 text-gbs-gray-500 transition-transform ${descOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div className={`${descOpen ? "block" : "hidden"} px-4 pb-4`}>
                <div
                  className="text-sm leading-relaxed text-gbs-gray-700 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_a]:text-gbs-red [&_img]:max-w-full [&_table]:w-full [&_table]:text-xs"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            </div>
          )}

          {/* Specs table — spec 05 item 9 */}
          {specs.length > 0 && (
            <div className="mt-6">
              <h2 className="font-condensed font-bold text-xs uppercase tracking-[0.12em] text-gbs-gray-500 mb-3">
                Specifications
              </h2>
              <div className="border border-gbs-gray-100 rounded-xl overflow-hidden">
                {specs.map((s, i) => (
                  <div
                    key={`${s.label}-${i}`}
                    className={`flex text-sm ${i % 2 === 0 ? "bg-gbs-gray-100/60" : "bg-white"}`}
                  >
                    <div className="w-2/5 px-4 py-2.5 text-gbs-gray-700">{s.label}</div>
                    <div className="flex-1 px-4 py-2.5 font-medium text-gbs-black">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jimmy cross-sell */}
          <div className="mt-6 bg-gbs-charcoal rounded-xl p-5 border-l-[3px] border-gbs-red">
            <span className="font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-red">
              Jimmy AI
            </span>
            <p className="mt-1.5 text-white text-sm">
              Not sure how much you need? Jimmy calculates the full material list for your job.
            </p>
            <Link
              href={`/jimmy?q=${encodeURIComponent(`How much ${product.title} do I need`)}`}
              className="mt-3 inline-flex items-center gap-1.5 text-white text-sm font-medium hover:text-gbs-red transition"
            >
              <Sparkles className="size-4 text-gbs-red" />
              Ask Jimmy →
            </Link>
          </div>
        </div>
      </div>

      {/* Related products — spec 05 item 10 */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-condensed font-bold text-xs uppercase tracking-[0.12em] text-gbs-red mb-3">
            Contractors also ordered
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {related.map((p) => (
              <div key={p.id} className="w-44 md:w-52 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sponsored slot */}
      <div className="mt-10">
        <AdBanner slot="product-below" />
      </div>
    </div>
  );
}

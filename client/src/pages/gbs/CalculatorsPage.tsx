/**
 * Calculators — screen 12.
 * SQF Calculator, Material Estimator (real products via cart.buildCart),
 * Project Cost Estimator. Material formulas from GBS-Developer-Handoff.md §5.
 */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Calculator, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCart, type CartProduct } from "@/contexts/CartContext";

type Tab = "sqf" | "materials" | "cost";

const inputCls =
  "w-full h-12 px-4 rounded-md bg-gbs-gray-100 border-[1.5px] border-gbs-gray-300 focus:border-gbs-red focus:outline-none text-[15px] text-gbs-black placeholder:text-gbs-gray-500 transition-colors";
const labelCls = "block text-[13px] font-medium text-gbs-gray-700 mb-1.5";

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ─── SQF Calculator ───────────────────────────────────────────────────────────

function SqfCalculator() {
  const [l, setL] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const L = num(l), W = num(w), H = num(h);
  const floor = L * W;
  const walls = 2 * (L + W) * H;
  const ceiling = L * W;
  const total = floor + walls + ceiling;
  const ready = L > 0 && W > 0 && H > 0;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Length (ft)</label>
          <input inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} placeholder="20" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Width (ft)</label>
          <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder="30" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Height (ft)</label>
          <input inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} placeholder="9" className={inputCls} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Floor", floor],
          ["Walls", walls],
          ["Ceiling", ceiling],
          ["Total", total],
        ].map(([label, value]) => (
          <div key={label as string} className={`rounded-xl p-4 ${label === "Total" ? "bg-gbs-charcoal" : "bg-gbs-gray-100"}`}>
            <div className={`font-condensed font-bold text-[11px] uppercase tracking-[0.12em] ${label === "Total" ? "text-gbs-red" : "text-gbs-gray-500"}`}>
              {label} SQF
            </div>
            <div className={`mt-1 font-condensed font-bold text-2xl ${label === "Total" ? "text-white" : "text-gbs-black"}`}>
              {ready ? Math.round(value as number).toLocaleString() : "—"}
            </div>
          </div>
        ))}
      </div>

      {ready && (
        <Link
          href={`/jimmy?q=${encodeURIComponent(
            `I have a ${L} by ${W} foot room with ${H} foot ceilings (${Math.round(total)} total sqf). What materials do I need?`,
          )}`}
          className="mt-5 inline-flex items-center gap-2 h-12 px-5 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] transition"
        >
          <Sparkles className="size-4" />
          Find materials for this space
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

// ─── Material Estimator ───────────────────────────────────────────────────────

const MATERIAL_TYPES = [
  { key: "drywall", label: "Drywall" },
  { key: "flooring", label: "Flooring" },
  { key: "paint", label: "Paint" },
  { key: "tile", label: "Tile" },
  { key: "insulation", label: "Insulation" },
] as const;

type MaterialKey = (typeof MATERIAL_TYPES)[number]["key"];

type Spec = { name: string; quantity: number; unit: string; category: string; searchQuery: string };

/** Handoff §5 formulas, +10% waste where specified. */
function buildSpecs(kind: MaterialKey, L: number, W: number, H: number): Spec[] {
  const floor = L * W;
  const walls = 2 * (L + W) * H;
  const ceiling = L * W;
  const up = Math.ceil;
  switch (kind) {
    case "drywall": {
      const area = walls + ceiling;
      return [
        { name: "1/2 in. drywall sheets 4x8", quantity: up((area / 32) * 1.1), unit: "sheets", category: "drywall", searchQuery: "1/2 gypsum board 4x8" },
        { name: "drywall screws", quantity: Math.max(1, up(area / 500)), unit: "lbs", category: "fasteners", searchQuery: "drywall screws" },
        { name: "joint compound", quantity: Math.max(1, up(area / 100)), unit: "gallons", category: "drywall", searchQuery: "joint compound" },
        { name: "drywall joint tape", quantity: Math.max(1, up(area / 500)), unit: "rolls", category: "drywall", searchQuery: "drywall tape" },
      ];
    }
    case "flooring":
      return [
        { name: "laminate flooring", quantity: up(floor * 1.1), unit: "sq ft", category: "flooring", searchQuery: "laminate flooring" },
        { name: "underlayment", quantity: Math.max(1, up(floor / 100)), unit: "rolls", category: "flooring", searchQuery: "floor underlayment" },
      ];
    case "paint": {
      const area = walls + ceiling;
      return [
        { name: "interior paint", quantity: Math.max(1, up(area / 200)), unit: "gallons", category: "paint", searchQuery: "interior paint gallon" },
        { name: "primer", quantity: Math.max(1, up(area / 400)), unit: "gallons", category: "paint", searchQuery: "primer gallon" },
        { name: "roller kit", quantity: 1, unit: "kit", category: "paint", searchQuery: "paint roller" },
        { name: "painter's tape", quantity: 1, unit: "roll", category: "paint", searchQuery: "painters tape" },
      ];
    }
    case "tile":
      return [
        { name: "floor tile", quantity: up(floor * 1.1), unit: "sq ft", category: "flooring", searchQuery: "floor tile" },
        { name: "thinset mortar", quantity: Math.max(1, up(floor / 50)), unit: "bags", category: "masonry", searchQuery: "thinset mortar" },
        { name: "grout", quantity: Math.max(1, up(floor / 100)), unit: "bags", category: "masonry", searchQuery: "grout" },
      ];
    case "insulation":
      return [
        { name: "fiberglass insulation batts", quantity: up(walls), unit: "sq ft", category: "insulation", searchQuery: "fiberglass insulation" },
      ];
  }
}

type EstimateLine = {
  materialName: string;
  materialUnit: string;
  quantity: number;
  product: { id: number; title: string; price: string; image: string | null; url: string; sku: string | null };
};

function MaterialEstimator() {
  const { add } = useCart();
  const [kind, setKind] = useState<MaterialKey>("drywall");
  const [l, setL] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [lines, setLines] = useState<EstimateLine[] | null>(null);
  const [total, setTotal] = useState<string>("0.00");
  const buildCart = trpc.cart.buildCart.useMutation();

  const L = num(l), W = num(w), H = num(h);
  const needsHeight = kind === "drywall" || kind === "paint" || kind === "insulation";
  const ready = L > 0 && W > 0 && (!needsHeight || H > 0);

  async function estimate() {
    if (!ready) return;
    setLines(null);
    try {
      const specs = buildSpecs(kind, L, W, H || 8);
      const res = await buildCart.mutateAsync({ materials: specs });
      setLines(res.cartItems as EstimateLine[]);
      setTotal(res.estimatedTotal);
      if (res.unmatched.length) {
        toast.info(`${res.unmatched.length} item(s) not in the catalog yet — ask Jimmy for alternatives.`);
      }
    } catch {
      toast.error("Couldn't build the estimate. Try again.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MATERIAL_TYPES.map((m) => (
          <button
            key={m.key}
            onClick={() => { setKind(m.key); setLines(null); }}
            className={`rounded-full px-4 py-2 text-[13px] font-medium border-[1.5px] transition ${
              kind === m.key
                ? "bg-gbs-red border-gbs-red text-white"
                : "border-gbs-gray-300 text-gbs-gray-700 hover:border-gbs-red hover:text-gbs-red"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Length (ft)</label>
          <input inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} placeholder="20" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Width (ft)</label>
          <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder="30" className={inputCls} />
        </div>
        {needsHeight && (
          <div>
            <label className={labelCls}>Height (ft)</label>
            <input inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} placeholder="9" className={inputCls} />
          </div>
        )}
      </div>

      <button
        onClick={estimate}
        disabled={!ready || buildCart.isPending}
        className="mt-4 inline-flex items-center gap-2 h-12 px-6 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] disabled:opacity-40 transition"
      >
        {buildCart.isPending && <Loader2 className="size-4 animate-spin" />}
        {buildCart.isPending ? "Building estimate..." : "Estimate materials"}
      </button>

      {lines && (
        <div className="mt-5 bg-white border border-gbs-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-3 font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-gray-500">
            Estimated materials
          </div>
          <div className="divide-y divide-gbs-gray-100">
            {lines.map((line, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="size-10 rounded bg-gbs-gray-100 shrink-0 overflow-hidden">
                  {line.product.image && (
                    <img src={line.product.image} alt="" className="w-full h-full object-contain" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-gbs-black truncate">{line.product.title}</div>
                  <div className="text-xs text-gbs-gray-500">
                    {line.quantity} {line.materialUnit}
                  </div>
                </div>
                <div className="font-condensed font-bold text-sm text-gbs-black">
                  ${(parseFloat(line.product.price) * line.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-t border-gbs-gray-100">
            <div className="text-sm text-gbs-black">
              Estimated total: <span className="font-condensed font-bold text-lg">${total}</span>
            </div>
            <button
              onClick={() => {
                for (const line of lines) {
                  const p: CartProduct = { ...line.product };
                  add(p, line.quantity);
                }
                toast.success(`Added ${lines.length} items to your cart`);
              }}
              className="h-10 px-4 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] text-sm shadow-red active:scale-[0.97] transition"
            >
              Add all to cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project Cost Estimator ───────────────────────────────────────────────────

const PROJECTS = [
  { key: "drywall", label: "Frame & drywall", matLow: 2.5, matHigh: 4, laborLow: 3, laborHigh: 6 },
  { key: "paint", label: "Painting", matLow: 0.5, matHigh: 1.2, laborLow: 1.5, laborHigh: 3.5 },
  { key: "flooring", label: "Flooring", matLow: 3, matHigh: 7, laborLow: 3, laborHigh: 8 },
  { key: "bathroom", label: "Bathroom remodel", matLow: 15, matHigh: 35, laborLow: 30, laborHigh: 70 },
  { key: "kitchen", label: "Kitchen remodel", matLow: 20, matHigh: 50, laborLow: 40, laborHigh: 90 },
] as const;

function CostEstimator() {
  const [projectKey, setProjectKey] = useState<(typeof PROJECTS)[number]["key"]>("drywall");
  const [sqf, setSqf] = useState("");
  const [grade, setGrade] = useState<"standard" | "premium">("standard");
  const S = num(sqf);
  const project = PROJECTS.find((p) => p.key === projectKey)!;
  const mult = grade === "premium" ? 1.5 : 1;
  const matLow = S * project.matLow * mult;
  const matHigh = S * project.matHigh * mult;
  const laborLow = S * project.laborLow;
  const laborHigh = S * project.laborHigh;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PROJECTS.map((p) => (
          <button
            key={p.key}
            onClick={() => setProjectKey(p.key)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium border-[1.5px] transition ${
              projectKey === p.key
                ? "bg-gbs-red border-gbs-red text-white"
                : "border-gbs-gray-300 text-gbs-gray-700 hover:border-gbs-red hover:text-gbs-red"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 max-w-md">
        <div>
          <label className={labelCls}>Square footage</label>
          <input inputMode="decimal" value={sqf} onChange={(e) => setSqf(e.target.value)} placeholder="1000" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Material grade</label>
          <div className="flex h-12 rounded-md border-[1.5px] border-gbs-gray-300 overflow-hidden">
            {(["standard", "premium"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`flex-1 text-[13px] font-medium capitalize transition ${
                  grade === g ? "bg-gbs-red text-white" : "bg-white text-gbs-gray-700"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {S > 0 && (
        <>
          <div className="mt-5 grid md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-gbs-gray-100 p-4">
              <div className="font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-gray-500">
                Materials
              </div>
              <div className="mt-1 font-condensed font-bold text-xl text-gbs-black">
                {fmt(matLow)} – {fmt(matHigh)}
              </div>
            </div>
            <div className="rounded-xl bg-gbs-gray-100 p-4">
              <div className="font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-gray-500">
                Labor (typical NYC range)
              </div>
              <div className="mt-1 font-condensed font-bold text-xl text-gbs-black">
                {fmt(laborLow)} – {fmt(laborHigh)}
              </div>
            </div>
            <div className="rounded-xl bg-gbs-charcoal p-4">
              <div className="font-condensed font-bold text-[11px] uppercase tracking-[0.12em] text-gbs-red">
                Total range
              </div>
              <div className="mt-1 font-condensed font-bold text-xl text-white">
                {fmt(matLow + laborLow)} – {fmt(matHigh + laborHigh)}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-gbs-gray-500">
            Ballpark planning numbers only — materials vary by spec, labor varies by contractor.
          </p>
          <Link
            href={`/jimmy?q=${encodeURIComponent(
              `Price out materials for a ${S} sqf ${project.label.toLowerCase()} project, ${grade} grade`,
            )}`}
            className="mt-4 inline-flex items-center gap-2 h-12 px-5 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] transition"
          >
            <Sparkles className="size-4" />
            Get exact pricing from GBS
          </Link>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "sqf", label: "SQF Calculator" },
  { key: "materials", label: "Material Estimator" },
  { key: "cost", label: "Project Cost" },
];

export default function CalculatorsPage() {
  const [tab, setTab] = useState<Tab>("sqf");

  return (
    <div className="container max-w-3xl py-6">
      <div className="flex items-center gap-2">
        <Calculator className="size-6 text-gbs-red" />
        <h1 className="font-condensed font-bold text-2xl text-gbs-black">Calculators</h1>
      </div>
      <p className="mt-1 text-sm text-gbs-gray-500">
        Job-site math, done. Measure once — we handle the rest.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-md px-4 py-2.5 font-condensed font-bold uppercase tracking-[0.08em] text-sm border-[1.5px] transition ${
              tab === t.key
                ? "bg-gbs-black border-gbs-black text-white"
                : "border-gbs-gray-300 text-gbs-gray-700 hover:border-gbs-black"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "sqf" && <SqfCalculator />}
        {tab === "materials" && <MaterialEstimator />}
        {tab === "cost" && <CostEstimator />}
      </div>
    </div>
  );
}

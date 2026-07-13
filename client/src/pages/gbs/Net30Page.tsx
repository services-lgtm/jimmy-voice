/**
 * Net 30 Terms — info + contractor credit application (screen 08 §8 of the
 * design handoff). No instant credit API yet: the application is emailed to
 * the GBS team (sales@gobuildd.com), which the risk-review process picks up.
 */
import { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, CreditCard, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const SALES_EMAIL = "sales@gobuildd.com";

const SPEND_OPTIONS = [
  "Under $2,000",
  "$2,000 – $5,000",
  "$5,000 – $15,000",
  "$15,000 – $50,000",
  "$50,000+",
];

const BENEFITS = [
  { icon: Clock, title: "Pay in 30 days", body: "Order materials now, settle the invoice within 30 days." },
  { icon: CreditCard, title: "One account for the crew", body: "Workers order against your account; you get one bill." },
  { icon: ShieldCheck, title: "Keep jobs moving", body: "No card at checkout — approved orders ship same-day." },
];

const STEPS = [
  "Fill out the short application below",
  "Our team reviews your business (usually 1–2 business days)",
  "Once approved, choose “Net 30” at checkout and pay within 30 days",
];

type Form = {
  business: string;
  contact: string;
  email: string;
  phone: string;
  ein: string;
  years: string;
  spend: string;
  address: string;
  trade: string;
  notes: string;
};

const EMPTY: Form = {
  business: "", contact: "", email: "", phone: "", ein: "",
  years: "", spend: SPEND_OPTIONS[0], address: "", trade: "", notes: "",
};

const inputCls =
  "w-full h-12 px-4 rounded-md bg-gbs-gray-100 border-[1.5px] border-gbs-gray-300 focus:border-gbs-red focus:outline-none text-[15px] text-gbs-black placeholder:text-gbs-gray-500 transition-colors";
const labelCls = "block text-[13px] font-medium text-gbs-gray-700 mb-1.5";

export default function Net30Page() {
  const [f, setF] = useState<Form>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const required: (keyof Form)[] = ["business", "contact", "email", "phone", "ein", "spend"];
  const missing = required.filter((k) => !f[k].trim());

  function submit() {
    if (missing.length) {
      toast.error("Please fill in the required fields.");
      return;
    }
    const body = [
      "NET 30 CREDIT APPLICATION — Go Build Supply",
      "",
      `Business name:        ${f.business}`,
      `Contact name:         ${f.contact}`,
      `Email:                ${f.email}`,
      `Phone:                ${f.phone}`,
      `EIN / Tax ID:         ${f.ein}`,
      `Years in business:    ${f.years || "—"}`,
      `Trade / business type:${f.trade || "—"}`,
      `Est. monthly spend:   ${f.spend}`,
      `Business address:     ${f.address || "—"}`,
      "",
      `Notes: ${f.notes || "—"}`,
    ].join("\n");
    const mailto = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
      `Net 30 Application — ${f.business}`,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <span className="inline-flex size-16 rounded-full bg-gbs-success/15 items-center justify-center">
          <CheckCircle2 className="size-8 text-gbs-success" />
        </span>
        <h1 className="mt-5 font-condensed font-bold text-3xl text-gbs-black">Application ready to send</h1>
        <p className="mt-3 text-gbs-gray-700 max-w-md mx-auto">
          Your email app should have opened with the application filled in — just tap <b>Send</b>. If
          it didn't open, email us directly at{" "}
          <a href={`mailto:${SALES_EMAIL}`} className="text-gbs-red font-medium">{SALES_EMAIL}</a>{" "}
          with your business name and EIN.
        </p>
        <p className="mt-2 text-sm text-gbs-gray-500">
          We review most applications within 1–2 business days and reply with a decision.
        </p>
        <button
          onClick={() => { setF(EMPTY); setSubmitted(false); }}
          className="mt-6 text-gbs-red font-medium text-sm hover:underline"
        >
          Start another application
        </button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      {/* Hero */}
      <div className="bg-gbs-charcoal rounded-2xl p-7 md:p-9 border-l-[3px] border-gbs-red">
        <span className="inline-flex items-center gap-1.5 font-condensed font-bold uppercase tracking-[0.12em] text-[11px] text-gbs-success bg-gbs-success/15 rounded px-2 py-0.5">
          Net 30 Terms
        </span>
        <h1 className="mt-3 font-condensed font-bold text-3xl md:text-4xl text-white leading-tight">
          Order now. Pay in 30 days.
        </h1>
        <p className="mt-2 text-gbs-gray-500 max-w-lg">
          GBS Net 30 is contractor credit for established businesses — buy materials, keep the job
          moving, and settle up within 30 days.
        </p>
      </div>

      {/* Benefits */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-white border border-gbs-gray-100 rounded-xl p-5 shadow-sm">
            <span className="size-10 rounded-lg bg-gbs-red-tint flex items-center justify-center">
              <Icon className="size-5 text-gbs-red" />
            </span>
            <h3 className="mt-3 font-condensed font-bold text-gbs-black text-lg leading-tight">{title}</h3>
            <p className="mt-1 text-sm text-gbs-gray-700 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-6 bg-gbs-gray-100/60 border border-gbs-gray-100 rounded-xl p-5">
        <h2 className="font-condensed font-bold uppercase tracking-[0.12em] text-xs text-gbs-gray-500 mb-3">
          How it works
        </h2>
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-gbs-black">
              <span className="shrink-0 size-6 rounded-full bg-gbs-red text-white font-condensed font-bold text-xs flex items-center justify-center">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {/* Application form */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="size-5 text-gbs-red" />
          <h2 className="font-condensed font-bold text-2xl text-gbs-black">Apply for Net 30</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Business name *</label>
            <input value={f.business} onChange={set("business")} className={inputCls} placeholder="ABC Contracting LLC" />
          </div>
          <div>
            <label className={labelCls}>Contact name *</label>
            <input value={f.contact} onChange={set("contact")} className={inputCls} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input value={f.email} onChange={set("email")} type="email" className={inputCls} placeholder="you@business.com" />
          </div>
          <div>
            <label className={labelCls}>Phone *</label>
            <input value={f.phone} onChange={set("phone")} type="tel" className={inputCls} placeholder="(555) 555-5555" />
          </div>
          <div>
            <label className={labelCls}>EIN / Tax ID *</label>
            <input value={f.ein} onChange={set("ein")} className={inputCls} placeholder="12-3456789" />
          </div>
          <div>
            <label className={labelCls}>Years in business</label>
            <input value={f.years} onChange={set("years")} className={inputCls} placeholder="e.g. 5" />
          </div>
          <div>
            <label className={labelCls}>Estimated monthly spend *</label>
            <select value={f.spend} onChange={set("spend")} className={inputCls}>
              {SPEND_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Trade / business type</label>
            <input value={f.trade} onChange={set("trade")} className={inputCls} placeholder="e.g. Drywall, GC, Electrical" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Business address</label>
            <input value={f.address} onChange={set("address")} className={inputCls} placeholder="Street, City, State, ZIP" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Anything else? (optional)</label>
            <textarea value={f.notes} onChange={set("notes")} rows={3}
              className={inputCls.replace("h-12", "min-h-24 py-3")} placeholder="Trade references, expected first order, etc." />
          </div>
        </div>

        <button
          onClick={submit}
          className="mt-6 inline-flex items-center gap-2 h-13 px-7 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] transition"
        >
          Submit application
          <ArrowRight className="size-4" />
        </button>
        <p className="mt-3 text-xs text-gbs-gray-500 max-w-lg">
          Submitting opens your email with the application filled in — just tap Send. All applications
          are subject to a credit review. Questions? Email{" "}
          <a href={`mailto:${SALES_EMAIL}`} className="text-gbs-red">{SALES_EMAIL}</a>.
        </p>
      </div>
    </div>
  );
}

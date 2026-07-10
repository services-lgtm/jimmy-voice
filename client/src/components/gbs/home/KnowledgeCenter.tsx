/**
 * Knowledge Center — guides answered by Jimmy, calculators link to real tools.
 */
import { ArrowRight, BookOpen, Calculator, FileText, Video } from "lucide-react";
import { useLocation } from "wouter";

const ARTICLES = [
  {
    type: "Guide",
    icon: BookOpen,
    category: "Insulation",
    title: "Complete Guide to R-Values: What Every Contractor Needs to Know",
    excerpt: "Climate zones, material comparisons, and code requirements — explained by Jimmy.",
    meta: "Ask Jimmy",
    action: "/jimmy?q=Explain R-values and how to pick insulation for NYC climate",
  },
  {
    type: "Calculator",
    icon: Calculator,
    category: "Estimating",
    title: "Material Estimator: How Much Do You Need?",
    excerpt: "Enter your room dimensions and get an instant materials estimate with live pricing.",
    meta: "Interactive tool",
    action: "/calculators",
  },
  {
    type: "Guide",
    icon: FileText,
    category: "Steel Framing",
    title: "Steel Stud Gauge Selection for Load-Bearing Walls",
    excerpt: "20GA vs 25GA vs 18GA — when to use each gauge and how to calculate requirements.",
    meta: "Ask Jimmy",
    action: "/jimmy?q=Which steel stud gauge do I need for load-bearing walls?",
  },
  {
    type: "How-To",
    icon: Video,
    category: "Drywall",
    title: "How to Install Cement Board in Wet Areas",
    excerpt: "Layout, cutting, fastening, and waterproofing for bathroom applications.",
    meta: "Ask Jimmy",
    action: "/jimmy?q=How do I install cement board in a bathroom?",
  },
  {
    type: "Guide",
    icon: BookOpen,
    category: "Lumber",
    title: "Pressure Treated Lumber: Choosing the Right Grade",
    excerpt: "Ground contact vs above ground — a breakdown of PT grades and when to use them.",
    meta: "Ask Jimmy",
    action: "/jimmy?q=Which pressure treated lumber grade do I need for a deck?",
  },
  {
    type: "Calculator",
    icon: Calculator,
    category: "Estimating",
    title: "SQF & Project Cost Calculators",
    excerpt: "Square footage, drywall sheets, screws, compound — calculated in seconds.",
    meta: "Interactive tool",
    action: "/calculators",
  },
];

const TYPE_STYLE: Record<string, string> = {
  Guide: "bg-gbs-red-tint text-gbs-red",
  Calculator: "bg-[#F0FDF4] text-gbs-success",
  "How-To": "bg-[#EFF6FF] text-gbs-info",
};

export default function KnowledgeCenter() {
  const [, navigate] = useLocation();

  return (
    <section className="py-20 bg-gbs-gray-100/50" id="knowledge">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
              Knowledge center
            </span>
            <h2 className="font-condensed font-bold text-4xl sm:text-5xl text-gbs-black leading-tight">
              Know more.
              <br />
              <span className="text-gbs-red">Build better.</span>
            </h2>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ARTICLES.map((a) => (
            <button
              key={a.title}
              onClick={() => navigate(a.action)}
              className="text-left bg-white border border-gbs-gray-100 hover:border-gbs-red/40 rounded-2xl p-6 shadow-sm transition group flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-condensed font-bold uppercase tracking-[0.08em] text-[10px] ${TYPE_STYLE[a.type]}`}
                >
                  <a.icon className="size-3" />
                  {a.type}
                </span>
                <span className="text-[11px] uppercase tracking-[0.08em] text-gbs-gray-500">
                  {a.category}
                </span>
              </div>
              <h3 className="font-condensed font-bold text-gbs-black text-lg leading-snug mb-2">
                {a.title}
              </h3>
              <p className="text-sm text-gbs-gray-700 leading-relaxed mb-4">{a.excerpt}</p>
              <span className="mt-auto flex items-center gap-1.5 text-gbs-red font-condensed font-bold uppercase tracking-[0.08em] text-xs">
                {a.meta}
                <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

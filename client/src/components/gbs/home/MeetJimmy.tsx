/**
 * "Meet Jimmy." split section — example prompts left, chat preview right.
 * Every action lands in the real Jimmy chat (/jimmy) which auto-sends the prompt.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ClipboardList, Search, Send, Sparkles, Zap } from "lucide-react";

const EXAMPLES = [
  "I need to insulate a 1,200 sq ft basement",
  "What do I need to frame a 10x12 room?",
  "Best drywall for a bathroom renovation?",
  "Steel stud framing for a commercial office",
  "Safety gear for a roofing crew of 5",
];

export default function MeetJimmy() {
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState("");
  const ask = (q: string) => q.trim() && navigate(`/jimmy?q=${encodeURIComponent(q.trim())}`);

  return (
    <section className="py-20 bg-white" id="jimmy">
      <div className="container">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-10">
          <div>
            <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
              Jimmy AI — Contractor Assistant
            </span>
            <h2 className="font-condensed font-bold text-4xl sm:text-5xl text-gbs-black">
              Meet Jimmy.
            </h2>
            <p className="text-gbs-gray-700 mt-3 max-w-md">
              Describe your project in plain English. Jimmy searches our full catalog and builds
              your complete materials list in seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Zap, label: "Instant estimates" },
              { icon: ClipboardList, label: "Full materials lists" },
              { icon: Search, label: "Real products, live prices" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 bg-gbs-gray-100 border border-gbs-gray-300/50 rounded-full px-3.5 py-1.5 text-[13px] text-gbs-gray-700"
              >
                <Icon className="size-3.5 text-gbs-red" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Example prompts */}
          <div>
            <div className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-gray-500 text-[11px] mb-3">
              Try asking Jimmy:
            </div>
            <div className="space-y-2.5">
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="w-full flex items-center justify-between gap-3 bg-gbs-gray-100 hover:bg-gbs-red-tint border border-transparent hover:border-gbs-red/30 rounded-lg px-4 py-3.5 text-left text-[15px] text-gbs-black transition group"
                >
                  {q}
                  <ChevronRight className="size-4 text-gbs-gray-500 group-hover:text-gbs-red group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
            <div className="mt-4 bg-gbs-charcoal rounded-xl p-4 border-l-[3px] border-gbs-red">
              <div className="flex items-center gap-2">
                <span className="size-8 rounded-full bg-gbs-red flex items-center justify-center">
                  <Sparkles className="size-4 text-white" />
                </span>
                <div>
                  <div className="font-condensed font-bold text-white text-sm">Jimmy AI</div>
                  <div className="text-[11px] text-gbs-gray-500">
                    <span className="text-gbs-success">●</span> Online · Searches the real catalog
                  </div>
                </div>
              </div>
              <p className="mt-2.5 text-xs text-gbs-gray-500 leading-relaxed">
                Trained on the full Go Build Supply catalog. Knows quantities, building math, and
                what contractors always forget to order.
              </p>
            </div>
          </div>

          {/* Chat preview */}
          <div className="bg-white border border-gbs-gray-100 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gbs-charcoal px-5 py-4 flex items-center gap-3">
              <span className="size-9 rounded-full bg-gbs-red flex items-center justify-center">
                <Sparkles className="size-4 text-white" />
              </span>
              <div>
                <div className="font-condensed font-bold text-white text-sm">
                  Jimmy — Contractor AI
                </div>
                <div className="text-[11px] text-gbs-gray-500">
                  <span className="text-gbs-success">●</span> Active · Powered by Go Build Supply
                </div>
              </div>
            </div>
            <div className="p-5 min-h-64">
              <div className="max-w-[85%] bg-gbs-red text-white rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                Hey! I'm Jimmy, your contractor assistant. Tell me about your project and I'll
                spec exactly what you need — materials list, quantities, and live pricing. What
                are you building today?
              </div>
            </div>
            <div className="p-4 border-t border-gbs-gray-100 flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(draft)}
                placeholder="Describe your project or ask about a product..."
                className="flex-1 h-11 px-4 rounded-lg bg-gbs-gray-100 border border-gbs-gray-300/60 focus:border-gbs-red focus:outline-none text-sm text-gbs-black placeholder:text-gbs-gray-500"
              />
              <button
                aria-label="Ask Jimmy"
                onClick={() => ask(draft)}
                className="size-11 rounded-lg bg-gbs-red hover:bg-gbs-red-dark text-white flex items-center justify-center shadow-red active:scale-95 transition"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Floating GBS speed bar — quick actions that follow you after the hero.
 * Desktop only (mobile already has the bottom tab bar).
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Calculator, Search, Sparkles, Truck, X, Zap } from "lucide-react";

export default function SpeedBar() {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [shipsToday, setShipsToday] = useState(true);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.7);
    const cutoffCheck = () => setShipsToday(new Date().getHours() < 14);
    onScroll();
    cutoffCheck();
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = setInterval(cutoffCheck, 60_000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearInterval(t);
    };
  }, []);

  if (dismissed) return null;

  const ACTIONS = [
    { icon: Search, label: "Search", go: () => navigate("/shop") },
    { icon: Sparkles, label: "Ask Jimmy", go: () => navigate("/jimmy") },
    { icon: Calculator, label: "Calculators", go: () => navigate("/calculators") },
    { icon: Truck, label: "Pallet Deals", go: () => navigate("/pallet-deals") },
  ];

  return (
    <div
      className={`hidden md:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-50 items-center gap-1 bg-gbs-black/95 backdrop-blur border border-white/10 rounded-full pl-2 pr-1.5 py-1.5 shadow-2xl transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <span className="flex items-center gap-1.5 bg-gbs-red rounded-full px-3 py-1.5 mr-1">
        <Zap className="size-3.5 text-white" fill="white" />
        <span className="font-condensed font-bold uppercase tracking-[0.08em] text-white text-xs">
          Go Build
        </span>
      </span>
      {ACTIONS.map(({ icon: Icon, label, go }) => (
        <button
          key={label}
          onClick={go}
          className="flex items-center gap-1.5 text-white/75 hover:text-white hover:bg-white/10 rounded-full px-3 py-1.5 text-[13px] transition"
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
      <span className="flex items-center gap-1.5 text-[12px] text-white/50 px-2.5">
        <span
          className={`size-1.5 rounded-full ${shipsToday ? "bg-gbs-success" : "bg-gbs-warning"}`}
        />
        {shipsToday ? "Ships today" : "Ships tomorrow"}
      </span>
      <button
        aria-label="Hide quick actions"
        onClick={() => setDismissed(true)}
        className="text-white/40 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

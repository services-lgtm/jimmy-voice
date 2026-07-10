/**
 * Fixed bottom navigation for mobile web — spec 3.7 / 6.5.
 * Home | Shop | [AI center elevated] | Cart | Account
 */
import { Link, useLocation } from "wouter";
import { Home, Search, ShoppingCart, Sparkles, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function MobileNav() {
  const [location] = useLocation();
  const { count } = useCart();

  const tab = (href: string, label: string, Icon: typeof Home, badge?: number) => {
    const active = location === href;
    return (
      <Link href={href} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1">
        <span className="relative">
          <Icon className={`size-6 ${active ? "text-gbs-red" : "text-gbs-gray-500"}`} />
          {badge != null && badge > 0 && (
            <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-gbs-red text-white text-[10px] font-bold flex items-center justify-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
        <span className={`text-[10px] font-medium ${active ? "text-gbs-red" : "text-gbs-gray-500"}`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gbs-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end h-16 px-2">
        {tab("/", "Home", Home)}
        {tab("/shop", "Shop", Search)}
        <Link href="/jimmy" className="flex flex-col items-center flex-1" aria-label="Jimmy AI">
          <span className="size-14 -mt-6 rounded-full bg-gbs-red shadow-red flex items-center justify-center active:scale-95 transition-transform">
            <Sparkles className="size-6 text-white" />
          </span>
          <span
            className={`text-[10px] font-medium mt-0.5 mb-1 ${
              location === "/jimmy" ? "text-gbs-red" : "text-gbs-gray-500"
            }`}
          >
            AI
          </span>
        </Link>
        {tab("/cart", "Cart", ShoppingCart, count)}
        {tab("/account", "Account", User)}
      </div>
    </nav>
  );
}

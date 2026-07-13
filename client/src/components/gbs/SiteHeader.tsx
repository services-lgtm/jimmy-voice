/**
 * GBS website header — spec 6.1.
 * Sticky white bar, compact logo left, nav center (desktop), cart right.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Sparkles, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const NAV_LINKS = [
  { href: "/shop", label: "Products" },
  { href: "/pallet-deals", label: "Pallet Deals" },
  { href: "/calculators", label: "Calculators" },
  { href: "/jimmy", label: "Jimmy AI" },
];

export default function SiteHeader() {
  const { count } = useCart();
  const { customer } = useAuth();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white border-b border-gbs-gray-100 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="container flex h-14 md:h-16 items-center gap-4">
        <Link href="/" className="shrink-0">
          <img
            src="/brand/GBS-Logo-Horizontal-Compact.png"
            alt="GBS — Go Build Supply"
            className="h-8 md:h-9 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-7 mx-auto">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-condensed font-semibold uppercase tracking-[0.08em] text-[15px] transition-colors ${
                location === l.href ? "text-gbs-red" : "text-gbs-black hover:text-gbs-red"
              }`}
            >
              {l.label === "Jimmy AI" ? (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-4 text-gbs-red" />
                  {l.label}
                </span>
              ) : (
                l.label
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 ml-auto md:ml-0">
          <Link
            href="/shop"
            aria-label="Search products"
            className="p-2 rounded-md hover:bg-gbs-gray-100 text-gbs-black"
          >
            <Search className="size-5" />
          </Link>
          {customer ? (
            <Link
              href="/account"
              aria-label="My account"
              title={customer.name}
              className="p-2 rounded-md hover:bg-gbs-gray-100 text-gbs-red"
            >
              <User className="size-5" />
            </Link>
          ) : (
            <Link
              href="/signin"
              aria-label="Sign in"
              className="flex items-center gap-1.5 px-2 md:px-2.5 py-2 rounded-md hover:bg-gbs-gray-100 text-gbs-black"
            >
              <User className="size-5" />
              <span className="hidden md:inline font-condensed font-semibold uppercase tracking-[0.06em] text-[14px]">
                Sign in
              </span>
            </Link>
          )}
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative p-2 rounded-md hover:bg-gbs-gray-100 text-gbs-black"
          >
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-gbs-red text-white text-[10px] font-bold flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

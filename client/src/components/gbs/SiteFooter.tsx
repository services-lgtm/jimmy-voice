import { Link } from "wouter";
import { STORE_URL } from "@/lib/gbs";

export default function SiteFooter() {
  return (
    <footer className="bg-gbs-black text-white mt-16 pb-24 md:pb-0">
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div>
          <img src="/brand/GBS-Logo-White.png" alt="GBS — Go Build Supply" className="h-14 w-auto" />
          <p className="mt-4 text-sm text-gbs-gray-500 max-w-60">
            Same-day delivery on 5,000+ building materials. NYC's contractor supply platform.
          </p>
        </div>
        <div>
          <h4 className="font-condensed font-bold uppercase tracking-[0.12em] text-xs text-gbs-gray-500 mb-3">
            Shop
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/shop" className="hover:text-gbs-red">All Products</Link></li>
            <li><Link href="/pallet-deals" className="hover:text-gbs-red">Pallet Deals</Link></li>
            <li><Link href="/calculators" className="hover:text-gbs-red">Calculators</Link></li>
            <li><Link href="/jimmy" className="hover:text-gbs-red">Jimmy AI</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-condensed font-bold uppercase tracking-[0.12em] text-xs text-gbs-gray-500 mb-3">
            Company
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={STORE_URL} target="_blank" rel="noreferrer" className="hover:text-gbs-red">
                gobuildsupply.com
              </a>
            </li>
            <li><Link href="/account" className="hover:text-gbs-red">Account</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-condensed font-bold uppercase tracking-[0.12em] text-xs text-gbs-gray-500 mb-3">
            Order smarter. Build faster.
          </h4>
          <p className="text-sm text-gbs-gray-500">
            Order by 2pm for same-day delivery in NYC and surrounding areas.
          </p>
        </div>
      </div>
      <div className="border-t border-gbs-gray-900">
        <div className="container py-4 text-xs text-gbs-gray-500">
          © {new Date().getFullYear()} GBS — Go Build Supply. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/**
 * Account hub — launch version. Full contractor accounts (orders, crew,
 * Net 30) arrive with the app phase; today this links to the store account.
 */
import { ArrowRight, Calculator, CreditCard, History, Sparkles, Users } from "lucide-react";
import { Link } from "wouter";
import { STORE_URL } from "@/lib/gbs";

export default function AccountPage() {
  const rows = [
    { icon: History, label: "Order history", href: `${STORE_URL}/account.php`, external: true },
    { icon: CreditCard, label: "Net 30 terms — apply", href: "/net30", external: false },
    { icon: Sparkles, label: "Jimmy AI", href: "/jimmy", external: false },
    { icon: Calculator, label: "Calculators", href: "/calculators", external: false },
    { icon: Users, label: "Workers & crew (coming soon)", href: "/account", external: false },
  ];

  return (
    <div className="container max-w-2xl py-6">
      <h1 className="font-condensed font-bold text-2xl text-gbs-black">My Account</h1>

      <div className="mt-4 bg-gbs-charcoal rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-gbs-red flex items-center justify-center font-condensed font-bold text-xl text-white">
            GB
          </div>
          <div>
            <div className="font-condensed font-bold text-xl text-white">Welcome, contractor</div>
            <div className="text-sm text-gbs-gray-500">
              Sign-in and full contractor accounts are coming with the GBS app.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white border border-gbs-gray-100 rounded-xl shadow-sm divide-y divide-gbs-gray-100">
        {rows.map(({ icon: Icon, label, href, external }) =>
          external ? (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gbs-gray-100/60 transition"
            >
              <Icon className="size-5 text-gbs-black" />
              <span className="flex-1 text-sm font-medium text-gbs-black">{label}</span>
              <ArrowRight className="size-4 text-gbs-gray-500" />
            </a>
          ) : (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gbs-gray-100/60 transition"
            >
              <Icon className="size-5 text-gbs-black" />
              <span className="flex-1 text-sm font-medium text-gbs-black">{label}</span>
              <ArrowRight className="size-4 text-gbs-gray-500" />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

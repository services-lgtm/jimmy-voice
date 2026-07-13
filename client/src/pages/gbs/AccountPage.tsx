/**
 * Account hub (screen 11 of the design handoff).
 * Signed-in dashboard: profile, order history, Net 30 status, quick links,
 * sign out. Not signed in → redirect to /signin.
 */
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Calculator,
  CreditCard,
  Loader2,
  LogOut,
  Package,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-gbs-success/15 text-gbs-success",
  Shipped: "bg-gbs-success/15 text-gbs-success",
  "Awaiting Fulfillment": "bg-amber-100 text-amber-700",
  "Awaiting Payment": "bg-amber-100 text-amber-700",
  "Awaiting Shipment": "bg-amber-100 text-amber-700",
  Pending: "bg-gbs-gray-100 text-gbs-gray-700",
  Cancelled: "bg-gbs-gray-100 text-gbs-gray-500",
  Refunded: "bg-gbs-gray-100 text-gbs-gray-500",
};

function money(v: string, currency: string) {
  const n = parseFloat(v) || 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { customer, loading, logout } = useAuth();

  // Not signed in → send to the sign-in screen.
  useEffect(() => {
    if (!loading && !customer) navigate("/signin");
  }, [loading, customer, navigate]);

  const ordersQuery = trpc.account.orders.useQuery(undefined, {
    enabled: !!customer,
    retry: false,
  });

  if (loading || !customer) {
    return (
      <div className="container max-w-2xl py-20 flex justify-center">
        <Loader2 className="size-6 animate-spin text-gbs-gray-500" />
      </div>
    );
  }

  const initials =
    customer.name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GB";

  const links = [
    { icon: CreditCard, label: "Net 30 terms", href: "/net30" },
    { icon: Sparkles, label: "Jimmy AI", href: "/jimmy" },
    { icon: Calculator, label: "Calculators", href: "/calculators" },
  ];

  async function signOut() {
    await logout();
    navigate("/signin");
  }

  return (
    <div className="container max-w-2xl py-6">
      <h1 className="font-condensed font-bold text-2xl text-gbs-black">My Account</h1>

      {/* Profile card */}
      <div className="mt-4 bg-gbs-charcoal rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-gbs-red flex items-center justify-center font-condensed font-bold text-xl text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-condensed font-bold text-xl text-white truncate">
              {customer.name}
            </div>
            <div className="text-sm text-gbs-gray-500 truncate">{customer.email}</div>
          </div>
          <button
            onClick={signOut}
            className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-sm text-gbs-gray-500 hover:text-white transition"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Net 30 status */}
      <Link
        href="/net30"
        className="mt-4 flex items-center gap-3 bg-white border border-gbs-gray-100 rounded-xl shadow-sm px-4 py-3.5 hover:bg-gbs-gray-100/60 transition"
      >
        <span className="size-10 rounded-lg bg-gbs-red-tint flex items-center justify-center">
          <CreditCard className="size-5 text-gbs-red" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gbs-black">Net 30 terms</div>
          <div className="text-xs text-gbs-gray-500">
            Apply to pay in 30 days on approved orders.
          </div>
        </div>
        <ArrowRight className="size-4 text-gbs-gray-500" />
      </Link>

      {/* Order history */}
      <div className="mt-6">
        <h2 className="font-condensed font-bold text-lg text-gbs-black">Order history</h2>
        <div className="mt-3 bg-white border border-gbs-gray-100 rounded-xl shadow-sm overflow-hidden">
          {ordersQuery.isLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="size-5 animate-spin text-gbs-gray-500" />
            </div>
          ) : ordersQuery.isError ? (
            <div className="px-4 py-8 text-center text-sm text-gbs-gray-500">
              {ordersQuery.error.message}
            </div>
          ) : (ordersQuery.data?.length ?? 0) === 0 ? (
            <div className="px-4 py-10 text-center">
              <Package className="size-8 text-gbs-gray-300 mx-auto" />
              <div className="mt-2 text-sm font-medium text-gbs-black">No orders yet</div>
              <div className="text-xs text-gbs-gray-500">Your orders will show up here.</div>
              <Link
                href="/shop"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gbs-red hover:underline"
              >
                Start shopping <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gbs-gray-100">
              {ordersQuery.data!.map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gbs-black">
                      Order #{o.id}
                    </div>
                    <div className="text-xs text-gbs-gray-500">
                      {formatDate(o.dateCreated)} · {o.itemsTotal} item
                      {o.itemsTotal === 1 ? "" : "s"}
                    </div>
                  </div>
                  {o.status && (
                    <span
                      className={
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold " +
                        (STATUS_STYLE[o.status] ?? "bg-gbs-gray-100 text-gbs-gray-700")
                      }
                    >
                      {o.status}
                    </span>
                  )}
                  <div className="shrink-0 text-sm font-condensed font-bold text-gbs-black w-20 text-right">
                    {money(o.total, o.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 bg-white border border-gbs-gray-100 rounded-xl shadow-sm divide-y divide-gbs-gray-100">
        {links.map(({ icon: Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gbs-gray-100/60 transition"
          >
            <Icon className="size-5 text-gbs-black" />
            <span className="flex-1 text-sm font-medium text-gbs-black">{label}</span>
            <ArrowRight className="size-4 text-gbs-gray-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}

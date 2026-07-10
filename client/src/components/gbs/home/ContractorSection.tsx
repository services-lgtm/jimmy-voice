/**
 * Contractor benefits — trade pricing, Net 30, jobsite delivery, etc.
 */
import { ArrowRight, Clock, Percent, Shield, Tag, Truck, Users } from "lucide-react";
import { Link } from "wouter";

const BENEFITS = [
  { icon: Tag, title: "Trade Pricing", body: "Contractor pricing below retail on all orders" },
  { icon: Truck, title: "Jobsite Delivery", body: "Direct to your site, scheduled or ASAP" },
  { icon: Clock, title: "Net 30 Terms", body: "Invoice billing for established contractors" },
  { icon: Percent, title: "Bulk & Pallet Discounts", body: "Tiered pricing on volume orders" },
  { icon: Users, title: "Project Accounts", body: "Manage multiple jobs from one dashboard" },
  { icon: Shield, title: "Priority Support", body: "Dedicated account manager for your team" },
];

export default function ContractorSection() {
  return (
    <section className="py-20 bg-white" id="contractors">
      <div className="container grid lg:grid-cols-2 gap-10 items-center">
        {/* Photo */}
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src="/brand/GBS-Forklift.jpg"
            alt="GBS jobsite delivery"
            className="w-full h-[380px] lg:h-[460px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gbs-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-xl p-4 flex items-center gap-3">
            <span className="size-10 rounded-lg bg-gbs-red flex items-center justify-center shrink-0">
              <Truck className="size-5 text-white" />
            </span>
            <div className="min-w-0">
              <div className="font-condensed font-bold text-gbs-black text-sm">
                Contractor account active
              </div>
              <div className="text-xs text-gbs-gray-700 truncate">
                Trade pricing unlocked · Jobsite delivery enabled
              </div>
            </div>
            <span className="ml-auto size-2.5 rounded-full bg-gbs-success shrink-0" />
          </div>
        </div>

        {/* Benefits */}
        <div>
          <span className="font-condensed font-bold uppercase tracking-[0.12em] text-gbs-red text-xs block mb-3">
            Built for pros
          </span>
          <h2 className="font-condensed font-bold text-4xl sm:text-5xl text-gbs-black leading-tight">
            Your supply house,
            <br />
            <span className="text-gbs-red">working for you.</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-3 bg-gbs-gray-100/70 border border-gbs-gray-100 rounded-xl p-4"
              >
                <span className="size-9 rounded-lg bg-gbs-red-tint flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-gbs-red" />
                </span>
                <div>
                  <div className="font-condensed font-bold text-gbs-black text-[15px]">{title}</div>
                  <div className="text-xs text-gbs-gray-700 mt-0.5 leading-relaxed">{body}</div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/account"
            className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.97] transition"
          >
            Set up contractor account
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

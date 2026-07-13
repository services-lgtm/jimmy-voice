/**
 * Sign in / create account (screen 15 of the design handoff).
 * One page, two modes. On success the server sets the session cookie and we
 * bounce back to /account (or wherever the user was headed).
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";

const inputCls =
  "w-full h-12 px-4 rounded-md bg-gbs-gray-100 border-[1.5px] border-gbs-gray-300 focus:border-gbs-red focus:outline-none text-[15px] text-gbs-black placeholder:text-gbs-gray-500 transition-colors";
const labelCls = "block text-[13px] font-medium text-gbs-gray-700 mb-1.5";

export default function SignInPage() {
  const [, navigate] = useLocation();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Shared form state (signup uses more of it than login).
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = trpc.account.login.useMutation();
  const signup = trpc.account.signup.useMutation();
  const busy = login.isPending || signup.isPending;

  async function done(name: string) {
    await refresh();
    toast.success(`Welcome, ${name.split(" ")[0]}!`);
    navigate("/account");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    try {
      if (mode === "login") {
        const c = await login.mutateAsync({ email, password });
        await done(c.name);
      } else {
        const c = await signup.mutateAsync({ firstName, lastName, company, email, password });
        await done(c.name);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="container max-w-md py-10">
      <div className="text-center">
        <span className="inline-flex size-12 rounded-xl bg-gbs-red items-center justify-center shadow-red">
          <Lock className="size-5 text-white" />
        </span>
        <h1 className="mt-4 font-condensed font-bold text-3xl text-gbs-black">
          {mode === "login" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-1.5 text-sm text-gbs-gray-500">
          {mode === "login"
            ? "Access your orders, Net 30 terms, and saved details."
            : "One account for ordering, order history, and Net 30 terms."}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mt-6 grid grid-cols-2 bg-gbs-gray-100 rounded-lg p-1 text-sm font-condensed font-bold uppercase tracking-[0.06em]">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              "h-9 rounded-md transition " +
              (mode === m ? "bg-white text-gbs-black shadow-sm" : "text-gbs-gray-500")
            }
          >
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First name *</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputCls}
                  placeholder="Jordan"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Last name *</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputCls}
                  placeholder="Rivera"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Company (optional)</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputCls}
                placeholder="ABC Contracting LLC"
                autoComplete="organization"
              />
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>Email *</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className={inputCls}
            placeholder="you@business.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Password *</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className={inputCls}
            placeholder={mode === "signup" ? "At least 7 characters" : "Your password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full h-13 rounded-md bg-gbs-red hover:bg-gbs-red-dark text-white font-condensed font-bold uppercase tracking-[0.08em] shadow-red active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gbs-gray-500">
        {mode === "login" ? (
          <>
            New to GBS?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="font-semibold text-gbs-red hover:underline"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="font-semibold text-gbs-red hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

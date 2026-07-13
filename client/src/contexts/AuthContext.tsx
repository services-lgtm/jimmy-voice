/**
 * Who is signed in, app-wide. Reads the login session from the server on load
 * (account.me), and exposes it plus a refresh + sign-out helper. The session
 * itself lives in a secure httpOnly cookie the browser can't read directly,
 * so we always ask the server.
 */
import { createContext, useContext, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type AuthCustomer = { id: number; email: string; name: string };

type AuthContextValue = {
  customer: AuthCustomer | null;
  loading: boolean;
  /** Re-check the session after login/signup. */
  refresh: () => Promise<void>;
  /** Sign out and clear the session. */
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const meQuery = trpc.account.me.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });
  const logoutMutation = trpc.account.logout.useMutation();

  const value: AuthContextValue = {
    customer: meQuery.data ?? null,
    loading: meQuery.isLoading,
    refresh: async () => {
      await utils.account.me.invalidate();
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
      await utils.account.invalidate();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

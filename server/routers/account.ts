/**
 * server/routers/account.ts
 * Customer account: sign up, sign in, view profile + order history, sign out.
 *
 * Passwords are checked by BigCommerce (server/bigcommerceCustomers.ts); we
 * never store them. On success we set a signed httpOnly session cookie
 * (server/auth.ts). The app phase reuses these same endpoints.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  AccountError,
  validateCredentials,
  getCustomer,
  createCustomer,
  getOrders,
} from "../bigcommerceCustomers";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  type SessionCustomer,
} from "../auth";

/** Turn our friendly AccountError into a tRPC error the client can show. */
function toTrpc(err: unknown): TRPCError {
  if (err instanceof AccountError) {
    return new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  console.error("[account] unexpected error:", err);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong. Please try again.",
  });
}

const displayName = (first: string, last: string, email: string) =>
  [first, last].filter(Boolean).join(" ").trim() || email;

export const accountRouter = router({
  /** Create an account, then sign the customer in. */
  signup: publicProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required").max(50),
        lastName: z.string().min(1, "Last name is required").max(50),
        email: z.string().email("Enter a valid email"),
        password: z.string().min(7, "Password must be at least 7 characters"),
        company: z.string().max(100).optional(),
        phone: z.string().max(30).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const customer = await createCustomer(input);
        const session: SessionCustomer = {
          id: customer.id,
          email: customer.email,
          name: displayName(customer.firstName, customer.lastName, customer.email),
        };
        setSessionCookie(ctx.res, createSessionToken(session));
        return session;
      } catch (err) {
        throw toTrpc(err);
      }
    }),

  /** Check credentials with BigCommerce and start a session. */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Enter a valid email"),
        password: z.string().min(1, "Enter your password"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const customerId = await validateCredentials(input.email, input.password);
        if (!customerId) {
          throw new AccountError("That email or password isn't right.");
        }
        const profile = await getCustomer(customerId);
        const session: SessionCustomer = {
          id: customerId,
          email: profile?.email ?? input.email,
          name: profile
            ? displayName(profile.firstName, profile.lastName, profile.email)
            : input.email,
        };
        setSessionCookie(ctx.res, createSessionToken(session));
        return session;
      } catch (err) {
        throw toTrpc(err);
      }
    }),

  /** Who is signed in? null if nobody. Used to hydrate the client on load. */
  me: publicProcedure.query(({ ctx }) => ctx.customer),

  /** Full profile for the signed-in customer (fresh from BigCommerce). */
  profile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const profile = await getCustomer(ctx.customer.id);
      if (!profile) {
        // Session valid but profile gone (e.g. deleted) — treat as signed out.
        return { id: ctx.customer.id, email: ctx.customer.email, firstName: "", lastName: "", company: "", phone: "", customerGroupId: 0 };
      }
      return profile;
    } catch (err) {
      throw toTrpc(err);
    }
  }),

  /** Order history for the signed-in customer. */
  orders: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getOrders(ctx.customer.id);
    } catch (err) {
      throw toTrpc(err);
    }
  }),

  /** End the session. */
  logout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.res);
    return { ok: true };
  }),
});

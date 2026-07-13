import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Requires a signed-in customer. Narrows ctx.customer to non-null so account
 * procedures can rely on it. Throws UNAUTHORIZED (→ 401) if not logged in.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.customer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in." });
  }
  return next({ ctx: { ...ctx, customer: ctx.customer } });
});

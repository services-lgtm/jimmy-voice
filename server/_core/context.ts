import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { readSessionCookie, verifySessionToken, type SessionCustomer } from "../auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  /** The signed-in customer, or null if not logged in. */
  customer: SessionCustomer | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const token = readSessionCookie(opts.req.headers.cookie);
  return {
    req: opts.req,
    res: opts.res,
    customer: verifySessionToken(token),
  };
}

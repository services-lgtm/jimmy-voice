/**
 * server/auth.ts
 * Login sessions for the Go Build Supply customer account.
 *
 * We don't run our own password database — BigCommerce checks the password
 * (see server/bigcommerceCustomers.ts). Once a customer is verified, we hand
 * their browser a small signed "session token" stored in an httpOnly cookie.
 * The token just says "this is customer #123, email X" and is signed with
 * SESSION_SECRET so it can't be forged. No data is stored on the server, which
 * matters because Render's disk is wiped on every deploy.
 *
 * The token is a mini-JWT: base64url(payload).base64url(HMAC-SHA256). We use
 * Node's built-in crypto so there are no extra npm packages to install.
 */
import crypto from "crypto";
import type { Response } from "express";
import { ENV } from "./_core/env";

export const SESSION_COOKIE = "gbs_session";
const MAX_AGE_DAYS = 30;

export type SessionCustomer = {
  id: number;
  email: string;
  name: string;
};

type TokenPayload = SessionCustomer & { exp: number };

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(data: string): string {
  const secret = ENV.sessionSecret || "dev-insecure-secret-change-me";
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}

/** Create a signed session token for a verified customer. */
export function createSessionToken(customer: SessionCustomer): string {
  const payload: TokenPayload = {
    ...customer,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_DAYS * 24 * 60 * 60,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verify a token and return the customer, or null if invalid/expired. */
export function verifySessionToken(token: string | undefined): SessionCustomer | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  // Constant-time compare so a wrong signature can't be guessed byte-by-byte.
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    ) as TokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.id, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

/** Read the session cookie off a raw Cookie header (no cookie-parser needed). */
export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Attach the session cookie to a response (login). */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "lax",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

/** Clear the session cookie (logout). */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

import { createHash, randomUUID } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";

export const GUEST_SESSION_COOKIE = "lawyer_ai_guest";
const GUEST_ISSUER = "lawyer-ai";
const GUEST_SESSION_TTL = "30d";

function signingKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be configured to protect anonymous LawyerAI sessions.");
  return new TextEncoder().encode(secret);
}

function numericGuestId(openId: string) {
  return (createHash("sha256").update(openId).digest().readUInt32BE(0) % 2_000_000_000) + 1;
}

function toGuestUser(openId: string): User {
  const now = new Date();
  return {
    id: numericGuestId(openId),
    openId,
    name: "Guest",
    email: null,
    loginMethod: "guest",
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

async function readGuestOpenId(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const token = cookies[GUEST_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { issuer: GUEST_ISSUER });
    return typeof payload.sub === "string" && payload.sub.startsWith("guest_") ? payload.sub : null;
  } catch {
    return null;
  }
}

async function issueGuestCookie(req: Request, res: Response, openId: string) {
  const token = await new SignJWT({ name: "Guest", loginMethod: "guest" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(GUEST_ISSUER)
    .setSubject(openId)
    .setIssuedAt()
    .setExpirationTime(GUEST_SESSION_TTL)
    .sign(signingKey());
  res.cookie(GUEST_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Browser-scoped guest identity used by the no-auth MVP. The signed, random
 * identifier keeps persisted sessions and documents isolated per browser.
 */
export async function resolveGuestUser(req: Request, res: Response): Promise<User> {
  const existing = await readGuestOpenId(req);
  if (existing) return toGuestUser(existing);

  const openId = `guest_${randomUUID()}`;
  await issueGuestCookie(req, res, openId);
  return toGuestUser(openId);
}

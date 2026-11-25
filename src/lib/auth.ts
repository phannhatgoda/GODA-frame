import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, run } from "./db";
import { effectiveFeatures, type Features, type Role } from "./features";

export const SESSION_COOKIE = "goda_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (>= 32 chars)");
    return new TextEncoder().encode("dev-only-insecure-secret-goda-frame-0000000");
  }
  return new TextEncoder().encode(s);
}

export interface DbUser {
  id: string;
  email: string;
  name: string;
  org_name: string | null;
  password_hash: string;
  role: Role;
  status: "active" | "suspended";
  plan: string;
  features: string;
  created_at: number;
  last_login_at: number | null;
}

export type SessionUser = Omit<DbUser, "password_hash"> & { perms: Features };

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  await run("UPDATE users SET last_login_at = ? WHERE id = ?", [Date.now(), userId]);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const u = await one<DbUser>("SELECT * FROM users WHERE id = ?", [String(payload.uid)]);
    if (!u || u.status !== "active") return null;
    const { password_hash: _ph, ...rest } = u;
    return { ...rest, perms: effectiveFeatures(u) };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export const isAdmin = (u: { role: string } | null) => u?.role === "admin" || u?.role === "superadmin";

export async function requireAdmin() {
  const u = await requireUser();
  if (!isAdmin(u)) redirect("/dashboard");
  return u;
}

import "server-only";
import { one, run } from "./db";
import { DEFAULT_SITE, siteSchema, type SiteSettings } from "./siteTypes";

const g = globalThis as unknown as { __godaSite?: { at: number; v: SiteSettings } };

export async function getSite(fresh = false): Promise<SiteSettings> {
  if (!fresh && g.__godaSite && Date.now() - g.__godaSite.at < 30_000) return g.__godaSite.v;
  let v = DEFAULT_SITE;
  try {
    const r = await one<{ v: string }>("SELECT v FROM settings WHERE k = 'site'");
    if (r) {
      const parsed = siteSchema.safeParse({ ...DEFAULT_SITE, ...JSON.parse(r.v) });
      if (parsed.success) v = parsed.data;
    }
  } catch {
    // DB unreachable → fall back to defaults so the public site still renders
  }
  g.__godaSite = { at: Date.now(), v };
  return v;
}

export async function saveSite(v: SiteSettings) {
  await run("INSERT INTO settings (k, v, updated_at) VALUES ('site', ?, ?) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = EXCLUDED.updated_at", [JSON.stringify(v), Date.now()]);
  g.__godaSite = { at: Date.now(), v };
}

/* ---------- Per-customer brand portals (feature: whiteLabel) ---------- */
const userCache = (globalThis as unknown as { __godaBrands?: Map<string, { at: number; v: SiteSettings | null }> });
userCache.__godaBrands ||= new Map();

/** Saved brand of a customer, or null if they never configured one. */
export async function getUserSite(userId: string, fresh = false): Promise<SiteSettings | null> {
  const m = userCache.__godaBrands!;
  const hit = m.get(userId);
  if (!fresh && hit && Date.now() - hit.at < 30_000) return hit.v;
  let v: SiteSettings | null = null;
  try {
    const r = await one<{ v: string }>("SELECT v FROM settings WHERE k = ?", ["brand:" + userId]);
    if (r) {
      const p = siteSchema.safeParse(JSON.parse(r.v));
      if (p.success) v = p.data;
    }
  } catch {}
  if (m.size > 5000) m.clear();
  m.set(userId, { at: Date.now(), v });
  return v;
}

export async function saveUserSite(userId: string, v: SiteSettings) {
  await run("INSERT INTO settings (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = EXCLUDED.updated_at", ["brand:" + userId, JSON.stringify(v), Date.now()]);
  userCache.__godaBrands!.set(userId, { at: Date.now(), v });
}

/** Brand that applies to a customer's pages: their own if the plan allows it, else null. */
export async function activeBrand(owner: { id: string }, perms: { whiteLabel: boolean }) {
  return perms.whiteLabel ? getUserSite(owner.id) : null;
}

/* ---------- Access control (Super Admin) ---------- */
export interface AccessSettings { allowSignup: boolean; message: string }
const DEFAULT_ACCESS: AccessSettings = { allowSignup: true, message: "Hệ thống đang tạm đóng đăng ký. Vui lòng liên hệ quản trị viên để được cấp tài khoản." };
const accessCache = globalThis as unknown as { __godaAccess?: { at: number; v: AccessSettings } };

export async function getAccess(fresh = false): Promise<AccessSettings> {
  const c = accessCache.__godaAccess;
  if (!fresh && c && Date.now() - c.at < 30_000) return c.v;
  let v = DEFAULT_ACCESS;
  try {
    const r = await one<{ v: string }>("SELECT v FROM settings WHERE k = 'access'");
    if (r) v = { ...DEFAULT_ACCESS, ...JSON.parse(r.v) };
  } catch {}
  accessCache.__godaAccess = { at: Date.now(), v };
  return v;
}

export async function saveAccess(v: AccessSettings) {
  await run("INSERT INTO settings (k, v, updated_at) VALUES ('access', ?, ?) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = EXCLUDED.updated_at", [JSON.stringify(v), Date.now()]);
  accessCache.__godaAccess = { at: Date.now(), v };
}

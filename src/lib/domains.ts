import "server-only";
import { one } from "./db";

/** Where customers point their CNAME. On Vercel this is the standard target. */
export const CNAME_TARGET = (process.env.CUSTOM_DOMAIN_TARGET || "cname.vercel-dns.com").toLowerCase();
export const APEX_A_RECORD = process.env.CUSTOM_DOMAIN_A || "76.76.21.21";
export const TXT_PREFIX = "_goda-verify";

export interface DomainRow {
  id: string;
  owner_id: string;
  hostname: string;
  campaign_id: string | null;
  verify_token: string;
  verified_at: number | null;
  created_at: number;
}

export function primaryHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").hostname.toLowerCase();
  } catch {
    return "localhost";
  }
}

export function normalizeHost(input: string) {
  let h = input.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h)) return null;
  return h;
}

export function isReservedHost(h: string) {
  const p = primaryHost();
  return h === p || h.endsWith("." + p) || h.endsWith(".vercel.app") || h.endsWith(".neon.tech") || h === "localhost";
}

/** DNS over HTTPS — works from serverless functions without UDP. */
async function doh(name: string, type: "TXT" | "CNAME" | "A"): Promise<string[]> {
  const urls = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { accept: "application/dns-json" }, cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!r.ok) continue;
      const j = (await r.json()) as { Answer?: { data: string }[] };
      return (j.Answer || []).map((a) => a.data.replace(/^"|"$/g, "").replace(/"\s*"/g, "").replace(/\.$/, "").toLowerCase());
    } catch {}
  }
  throw new Error("DNS_UNAVAILABLE");
}

export async function checkDns(d: DomainRow) {
  const [txt, cname, a] = await Promise.all([
    doh(`${TXT_PREFIX}.${d.hostname}`, "TXT").catch(() => [] as string[]),
    doh(d.hostname, "CNAME").catch(() => [] as string[]),
    doh(d.hostname, "A").catch(() => [] as string[]),
  ]);
  const txtOk = txt.includes(d.verify_token.toLowerCase());
  const routeOk = cname.some((c) => c === CNAME_TARGET || c.endsWith(".vercel-dns.com")) || a.includes(APEX_A_RECORD);
  return { txtOk, routeOk, found: { txt, cname, a } };
}

/* ---------- Optional: attach the domain to the Vercel project automatically ---------- */
function vercelCfg() {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project) return null;
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
  return { token, project, team };
}
export const vercelAutomation = () => !!vercelCfg();

export async function vercelAddDomain(host: string): Promise<{ ok: boolean; message?: string }> {
  const v = vercelCfg();
  if (!v) return { ok: false, message: "manual" };
  const r = await fetch(`https://api.vercel.com/v10/projects/${v.project}/domains${v.team}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${v.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: host }),
  });
  if (r.ok) return { ok: true };
  const j = (await r.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  if (j.error?.code === "domain_already_in_use" || j.error?.code === "domain_already_exists") return { ok: true };
  return { ok: false, message: j.error?.message || `Vercel ${r.status}` };
}

export async function vercelRemoveDomain(host: string) {
  const v = vercelCfg();
  if (!v) return;
  await fetch(`https://api.vercel.com/v9/projects/${v.project}/domains/${host}${v.team}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${v.token}` },
  }).catch(() => {});
}

export async function findVerifiedDomain(host: string) {
  return one<DomainRow>("SELECT * FROM domains WHERE hostname = ? AND verified_at IS NOT NULL", [host.toLowerCase()]);
}

export interface VercelChallenge { type: string; domain: string; value: string; reason?: string }

/**
 * Vercel may require its own TXT challenge (e.g. when the apex domain is already used by another
 * Vercel account). Ask Vercel to (re)verify and return any records still pending.
 */
export async function vercelDomainStatus(host: string): Promise<{ verified: boolean; challenges: VercelChallenge[] } | null> {
  const v = vercelCfg();
  if (!v) return null;
  const q = v.team;
  const auth = { Authorization: `Bearer ${v.token}` };
  try {
    let r = await fetch(`https://api.vercel.com/v9/projects/${v.project}/domains/${host}${q}`, { headers: auth, cache: "no-store" });
    if (!r.ok) return null;
    let d = (await r.json()) as { verified: boolean; verification?: VercelChallenge[] };
    if (!d.verified) {
      r = await fetch(`https://api.vercel.com/v9/projects/${v.project}/domains/${host}/verify${q}`, { method: "POST", headers: auth });
      if (r.ok) d = (await r.json()) as typeof d;
    }
    return { verified: !!d.verified, challenges: d.verified ? [] : d.verification || [] };
  } catch {
    return null;
  }
}

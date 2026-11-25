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

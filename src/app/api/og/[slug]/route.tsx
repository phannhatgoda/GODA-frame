import { ImageResponse } from "next/og";
import { getCampaignBySlug } from "@/lib/campaigns";
import { getSite, getUserSite } from "@/lib/site";
import { one } from "@/lib/db";
import { featuresFor } from "@/lib/plans";
import { defaultPortal } from "@/lib/siteTypes";
import { readAsset } from "@/lib/storage";
import { isDark } from "@/lib/color";

export const runtime = "nodejs";

const W = 1200, H = 630;
const fontCache = new Map<string, ArrayBuffer | null>();

/** Be Vietnam Pro subset to exactly the characters we draw (keeps Vietnamese diacritics correct). */
async function font(weight: 500 | 800, text: string) {
  const key = weight + ":" + text;
  if (fontCache.has(key)) return fontCache.get(key)!;
  let data: ArrayBuffer | null = null;
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&text=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(4000) })).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (src) data = await (await fetch(src, { signal: AbortSignal.timeout(4000) })).arrayBuffer();
  } catch {}
  if (fontCache.size > 200) fontCache.clear();
  fontCache.set(key, data);
  return data;
}

/** Inline images as data URLs (uploaded assets straight from the DB, others over HTTP). */
async function inline(src: string, base: string): Promise<string | null> {
  if (!src) return null;
  try {
    if (src.startsWith("/api/files/")) {
      const f = await readAsset(src.slice("/api/files/".length));
      return f ? `data:${f.mime};base64,${f.buf.toString("base64")}` : null;
    }
    const r = await fetch(new URL(src, base), { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") || "image/png";
    return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const origin = new URL(req.url).origin;
  const platform = await getSite();
  /** brand shown on the card: the platform's, or the campaign owner's own brand (Thương hiệu riêng) */
  let site = platform;
  async function ownerBrand(ownerId: string, fallback = false) {
    const o = await one<{ role: string; plan: string; features: string; name: string; org_name: string | null }>("SELECT role, plan, features, name, org_name FROM users WHERE id = ?", [ownerId]);
    if (!o || !(await featuresFor(o)).whiteLabel) return null;
    return (await getUserSite(ownerId)) ?? (fallback ? defaultPortal(o.org_name || o.name) : null);
  }
  const isPortal = slug.startsWith("brand-");
  if (isPortal) {
    const b = await ownerBrand(slug.slice(6), true);
    if (!b) return new Response("Not found", { status: 404 });
    site = b;
  }
  const headers = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" };

  let bg = site.brand.ink, fg = "#FFFFFF", accent = site.brand.primary, accent2 = site.brand.primary;
  let title = site.brand.name, sub = site.seo.description, tag = "", frameSrc: string | null = null, logo: string | null = null;
  let ratio = 1;
  let rawFrame = "/samples/avatar-ring.svg";

  if (slug !== "site" && !isPortal) {
    const c = await getCampaignBySlug(slug);
    if (!c || c.status === "draft") return new Response("Not found", { status: 404 });
    site = (await ownerBrand(c.owner_id)) ?? platform;
    const t = c.theme;
    bg = t.background; accent = t.template === "festive" ? t.secondary : t.primary; accent2 = t.secondary;
    fg = isDark(bg) ? "#FFFFFF" : t.text;
    title = t.headline || c.title; sub = t.subheadline; tag = t.hashtag;
    ratio = c.config.width / c.config.height;
    if (c.config.frameUrl) rawFrame = c.config.frameUrl;
    [frameSrc, logo] = await Promise.all([inline(c.config.frameUrl, origin), inline(t.logoUrl || (site !== platform ? site.brand.logoUrl : ""), origin)]);
  } else {
    logo = await inline(site.brand.logoUrl, origin);
    title = site.seo.title || site.brand.name;
  }

  title = clip(title, 80);
  sub = clip(sub || "", 140);
  const text = title + sub + tag + site.brand.name + "Tạo ảnh của bạn →";
  const [bold, medium] = await Promise.all([font(800, text), font(500, text)]);
  const fonts = [
    ...(bold ? [{ name: "BVP", data: bold, weight: 800 as const, style: "normal" as const }] : []),
    ...(medium ? [{ name: "BVP", data: medium, weight: 500 as const, style: "normal" as const }] : []),
  ];

  // frame box on the right, fitted inside 500×540 keeping its aspect ratio
  const fh = Math.min(540, 500 / ratio), fw = fh * ratio;

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: W, height: H, display: "flex", color: fg, fontFamily: "BVP", position: "relative", overflow: "hidden",
            backgroundColor: bg,
            // soft glows (satori has no CSS blur filter → radial gradients)
            backgroundImage: `radial-gradient(circle at 8% 0%, ${accent}55 0%, transparent 45%), radial-gradient(circle at 100% 100%, ${accent2}66 0%, transparent 50%)`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: frameSrc ? "0 0 0 72px" : "0 96px", width: frameSrc ? 640 : W, gap: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} height={56} style={{ objectFit: "contain", maxWidth: 260 }} alt="" /> : <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: accent }}>{site.brand.name}</div>}
            <div style={{ display: "flex", fontSize: title.length > 40 ? 50 : 62, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{title}</div>
            {(slug === "site" || isPortal) && <div style={{ display: "flex", width: 120, height: 8, borderRadius: 8, background: accent }} />}
            {sub && <div style={{ display: "flex", fontSize: 26, fontWeight: 500, lineHeight: 1.35, opacity: 0.78 }}>{sub}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              {slug !== "site" && !isPortal && <div style={{ display: "flex", background: accent, color: isDark(accent) ? "#fff" : "#111", fontSize: 24, fontWeight: 800, padding: "14px 26px", borderRadius: 16 }}>Tạo ảnh của bạn →</div>}
              {tag && <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: accent }}>{clip(tag, 40)}</div>}
            </div>
          </div>
          {frameSrc && (
            <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 40 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frameSrc} width={fw} height={fh} alt="" style={{ objectFit: "contain", borderRadius: 24, boxShadow: "0 30px 60px rgba(0,0,0,.35)" }} />
            </div>
          )}
        </div>
      ),
      { width: W, height: H, fonts: fonts.length ? fonts : undefined, headers },
    );
  } catch (e) {
    console.error("og render failed", e);
    // never break link previews: fall back to the raw frame / brand image
    return Response.redirect(new URL(rawFrame, origin), 302);
  }
}

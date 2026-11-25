"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { DEFAULT_DESIGN, FONTS, type CampaignPublic, type FontId, type Theme, type Variant } from "@/lib/types";
import { FrameStudio } from "./FrameStudio";
import { cx } from "../ui";
import { isDark } from "@/lib/color";

function visitorId() {
  try {
    let v = localStorage.getItem("goda_vid");
    if (!v) {
      v = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      localStorage.setItem("goda_vid", v);
    }
    return v;
  } catch {
    return "anon";
  }
}

function sourceOf(embed?: boolean) {
  const q = new URLSearchParams(location.search);
  const s = q.get("utm_source") || q.get("src") || q.get("ref");
  if (s) return s.slice(0, 60);
  if (embed) return "embed";
  try {
    if (document.referrer) {
      const h = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (h !== location.hostname) {
        if (/facebook|fb\./.test(h)) return "facebook";
        if (/zalo/.test(h)) return "zalo";
        if (/linkedin|lnkd/.test(h)) return "linkedin";
        if (/google/.test(h)) return "google";
        return h;
      }
    }
  } catch {}
  return /Zalo/i.test(navigator.userAgent) ? "zalo" : /FBAN|FBAV|FB_IAB/i.test(navigator.userAgent) ? "facebook" : "";
}

/** Background for the page, from template + bgStyle. */
function background(t: Theme): React.CSSProperties {
  const { background: bg, primary: p, secondary: s } = t;
  switch (t.bgStyle) {
    case "gradient":
      return { background: `linear-gradient(155deg, ${bg} 0%, ${p} 55%, ${s} 100%)` };
    case "mesh":
      return {
        background: `radial-gradient(60% 50% at 10% 0%, ${p}55, transparent 70%), radial-gradient(50% 45% at 100% 30%, ${s}66, transparent 70%), radial-gradient(60% 50% at 30% 100%, ${p}33, transparent 70%), ${bg}`,
      };
    case "image":
      return t.coverUrl
        ? (() => {
            const a = Math.round(((t.design?.overlay ?? 45) / 100) * 255).toString(16).padStart(2, "0");
            return { backgroundImage: `linear-gradient(${bg}${a}, ${bg}${a}), url(${JSON.stringify(t.coverUrl).slice(1, -1)})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: bg };
          })()
        : { background: bg };
    default:
      return { background: bg };
  }
}

interface Skin {
  surface: string;
  headline: string;
  eyebrow?: string;
  decor?: React.ReactNode;
  pageClass?: string;
}

function skinFor(t: Theme, type: string, dark: boolean): Skin {
  const glassSurface = dark ? "bg-white/10 ring-1 ring-white/15 backdrop-blur-xl" : "bg-white/70 ring-1 ring-black/5 backdrop-blur-xl";
  switch (t.template) {
    case "bold":
      return {
        surface: dark ? "bg-white/10 ring-1 ring-white/10" : "bg-white shadow-soft ring-1 ring-black/5",
        headline: "font-extrabold tracking-tight",
        decor: <div className="pointer-events-none absolute inset-x-0 top-0 h-[38%] lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[440px]" style={{ background: t.coverUrl ? `linear-gradient(#0006,#0006), url(${JSON.stringify(t.coverUrl).slice(1, -1)}) center/cover` : `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }} />,
        pageClass: "bold-skin",
      };
    case "glass":
      return { surface: "bg-white/15 ring-1 ring-white/30 backdrop-blur-xl text-white", headline: "font-bold tracking-tight drop-shadow-sm" };
    case "festive":
      return {
        surface: "bg-black/20 ring-1 backdrop-blur-md",
        headline: "font-bold tracking-tight",
        eyebrow: type === "invitation" ? "Trân trọng kính mời" : "Chung vui",
        decor: (
          <>
            <div className="pointer-events-none absolute inset-0 opacity-[.18]" style={{ backgroundImage: `radial-gradient(${t.secondary} 1.2px, transparent 1.6px)`, backgroundSize: "22px 22px" }} />
            <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border-[18px] opacity-25" style={{ borderColor: t.secondary }} />
            <div className="pointer-events-none absolute -bottom-28 -left-20 size-96 rounded-full border-[22px] opacity-20" style={{ borderColor: t.secondary }} />
          </>
        ),
      };
    case "mono":
      return { surface: dark ? "bg-white/5 ring-1 ring-white/20" : "bg-white ring-1 ring-black", headline: "font-extrabold uppercase tracking-tight", eyebrow: type === "invitation" ? "Invitation" : "Frame" };
    case "studio":
      return {
        surface: "bg-white/[.07] ring-1 ring-white/10 backdrop-blur",
        headline: "font-bold tracking-tight",
        eyebrow: type === "invitation" ? "Thư mời" : "Frame avatar",
      };
    case "paper":
      return {
        surface: dark ? "bg-white/10 ring-1 ring-white/10" : "bg-white/70 ring-1 backdrop-blur",
        headline: "font-normal",
        eyebrow: type === "invitation" ? "Trân trọng kính mời" : "Cùng tham gia",
        decor: <div className="pointer-events-none absolute inset-3 rounded-[calc(var(--r)*.8)] border lg:inset-5" style={{ borderColor: t.primary + "40" }} />,
      };
    case "neon":
      return {
        surface: "bg-white/[.06] ring-1 ring-white/15 backdrop-blur",
        headline: "font-extrabold tracking-tight",
        decor: (
          <>
            <div className="pointer-events-none absolute -left-32 top-10 size-[420px] rounded-full opacity-30 blur-[110px]" style={{ background: t.primary }} />
            <div className="pointer-events-none absolute -right-32 bottom-0 size-[420px] rounded-full opacity-30 blur-[110px]" style={{ background: t.secondary }} />
          </>
        ),
      };
    default:
      return { surface: glassSurface, headline: "font-bold tracking-tight" };
  }
}

const SURFACES = {
  glass: (dark: boolean) => (dark ? "bg-white/10 ring-1 ring-white/15 backdrop-blur-xl" : "bg-white/70 ring-1 ring-black/5 backdrop-blur-xl"),
  solid: (dark: boolean) => (dark ? "bg-neutral-900 ring-1 ring-white/10" : "bg-white shadow-soft ring-1 ring-black/5"),
  outline: (dark: boolean) => (dark ? "ring-1 ring-white/40" : "ring-1 ring-black/30"),
  none: () => "",
};

export function GuestView({ campaign, variants, poweredBy, preview, embed, canCustomCss }: { campaign: CampaignPublic; variants: Variant[]; poweredBy: boolean; preview?: boolean; embed?: boolean; canCustomCss?: boolean }) {
  const t = campaign.theme;
  const ds = { ...DEFAULT_DESIGN, ...t.design };
  const bgDark = t.bgStyle === "gradient" ? isDark(t.primary) || isDark(t.background) : isDark(t.background);
  const dark = t.template === "glass" || t.template === "neon" || t.template === "studio" ? true : bgDark;
  const base = skinFor(t, campaign.type, dark);
  const skin = { ...base, surface: ds.surface === "auto" ? base.surface : SURFACES[ds.surface](dark) };
  const [active, setActive] = useState(0);
  const v = variants[Math.min(active, variants.length - 1)] ?? variants[0];

  const fontHref = useMemo(() => {
    const ids = new Set<FontId>([t.font, ...variants.flatMap((x) => x.config.texts.map((f) => f.font))]);
    return `https://fonts.googleapis.com/css2?${[...ids].map((i) => "family=" + FONTS[i].google).join("&")}&display=swap`;
  }, [t.font, variants]);

  const track = useCallback(
    (type: string, extra?: Record<string, unknown>) => {
      if (preview) return;
      const body = JSON.stringify({ campaignId: v.id, type, visitorId: visitorId(), source: sourceOf(embed), ...extra });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    },
    [v.id, preview, embed],
  );

  // one "view" per experience per browser session
  const viewed = useRef(new Set<string>());
  useEffect(() => {
    if (preview || viewed.current.has(v.id)) return;
    viewed.current.add(v.id);
    const key = "goda_v_" + v.id;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    track("view");
  }, [v.id, preview, track]);

  useEffect(() => {
    if (!embed) return;
    window.parent?.postMessage({ type: "goda:embed-ready", slug: campaign.slug }, "*");
  }, [embed, campaign.slug]);

  const onBand = t.template === "bold";
  const tagColor = t.template === "festive" ? t.secondary : onBand || t.template === "glass" ? "#fff" : t.primary;
  const center = ds.align === "center";
  const vars = { "--r": `${t.radius}px`, ...background(t), color: t.text, fontFamily: FONTS[t.font].css } as React.CSSProperties;
  const hStyle: React.CSSProperties = { ...(onBand ? { color: "#fff" } : {}), ...(ds.headlineWeight ? { fontWeight: ds.headlineWeight } : {}) };

  const logo = (cls: string) =>
    ds.showLogo && t.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={t.logoUrl} alt="Logo" className={cx("w-auto object-contain", cls)} />
    ) : null;

  const linkList = ds.showLinks && t.links.length > 0 ? t.links : [];
  const links = linkList.length > 0 && (
    <div className={cx("flex flex-wrap gap-2", center && "justify-center")}>
      {linkList.map((l, i) => (
        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className={cx("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition hover:opacity-80", skin.surface)}>
          {l.label} <ExternalLink className="size-3 opacity-60" />
        </a>
      ))}
    </div>
  );

  const powered = poweredBy && (
    <a href="/" target="_blank" className="inline-flex items-center gap-1 text-[11px] font-medium opacity-60 hover:opacity-100">
      Powered by <b>GODA.Frame</b>
    </a>
  );

  const eyebrow = skin.eyebrow && (
    <div className={cx("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.25em]", center && "justify-center")} style={{ color: t.template === "festive" ? t.secondary : t.primary }}>
      <span className="h-px w-6" style={{ background: "currentColor" }} />{skin.eyebrow}
    </div>
  );

  const info = (
    <div className={cx("space-y-4", center && "text-center [&_img]:mx-auto")}>
      {logo("h-11 max-w-[200px]")}
      {eyebrow}
      <h1 className={cx("leading-[1.08]", skin.headline)} style={{ ...hStyle, fontSize: `${36 * ds.headlineScale}px` }}>{t.headline}</h1>
      {ds.showSub && t.subheadline && <p className="text-[15px] leading-relaxed opacity-75" style={onBand ? { color: "#fff" } : undefined}>{t.subheadline}</p>}
      {ds.showHashtag && t.hashtag && <div className="text-sm font-bold" style={{ color: tagColor }}>{t.hashtag}</div>}
    </div>
  );

  const mobileHeader = (
    <div className={cx("flex items-center gap-2.5", center && "justify-center text-center")}>
      {logo("h-8 max-w-[96px] shrink-0")}
      <div className="min-w-0">
        <h1 className={cx("line-clamp-2 leading-tight", skin.headline)} style={{ ...hStyle, fontSize: `${18 * ds.headlineScale}px` }}>{t.headline}</h1>
        {ds.showHashtag && t.hashtag && <div className="truncate text-[11px] font-bold" style={{ color: tagColor }}>{t.hashtag}</div>}
      </div>
    </div>
  );

  // shown directly on mobile (not hidden behind the info button)
  const mobileInfo = (ds.showSub && t.subheadline) || linkList.length > 0 ? (
    <div className={cx("space-y-2 pb-1", center && "text-center")}>
      {ds.showSub && t.subheadline && <p className="line-clamp-2 text-[13px] leading-snug opacity-75" style={onBand ? { color: "#fff" } : undefined}>{t.subheadline}</p>}
      {linkList.length > 0 && (
        <div className={cx("flex gap-1.5 overflow-x-auto scrollbar-none", center && "justify-center")}>
          {linkList.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className={cx("inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium", skin.surface)}>
              {l.label} <ExternalLink className="size-3 opacity-60" />
            </a>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const mobileFooter = (ds.showFooter && t.footerText) || poweredBy ? (
    <div className="flex items-center justify-center gap-2 text-center text-[10.5px] leading-tight opacity-60">
      {ds.showFooter && t.footerText && <span className="line-clamp-1">{t.footerText}</span>}
      {ds.showFooter && t.footerText && poweredBy && <span>·</span>}
      {powered}
    </div>
  ) : null;

  const footer = (
    <div className={cx("space-y-3 text-xs", center && "text-center")}>
      {links}
      {ds.showFooter && t.footerText && <p className="whitespace-pre-line opacity-60">{t.footerText}</p>}
      {powered}
    </div>
  );

  const sheet = (
    <div className="space-y-4">
      {logo("h-10 max-w-[160px]")}
      <h2 className="text-xl font-bold" style={{ fontFamily: FONTS[t.font].css }}>{t.headline}</h2>
      {t.subheadline && <p className="text-sm text-stone-600">{t.subheadline}</p>}
      {t.hashtag && <p className="text-sm font-bold" style={{ color: t.primary }}>{t.hashtag}</p>}
      {t.links.length > 0 && (
        <div className="space-y-2">
          {t.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium">
              {l.label} <ExternalLink className="size-4 opacity-50" />
            </a>
          ))}
        </div>
      )}
      {t.footerText && <p className="whitespace-pre-line text-xs text-stone-500">{t.footerText}</p>}
      {poweredBy && <p className="text-xs text-stone-400">Powered by <b>GODA.Frame</b></p>}
    </div>
  );

  const accent = t.template === "festive" ? t.secondary : t.primary;
  const tabs =
    variants.length > 1 ? (
      <div className={cx("flex gap-1 rounded-full p-1", skin.surface)} role="tablist">
        {variants.map((x, i) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className="flex-1 truncate rounded-full px-3 py-2 text-[13px] font-semibold transition"
            style={i === active ? { background: accent, color: isDark(accent) ? "#fff" : "#17120E" } : { opacity: 0.75 }}
          >
            {x.label}
          </button>
        ))}
      </div>
    ) : undefined;

  const css = canCustomCss && ds.customCss ? ds.customCss : "";

  return (
    <div style={vars} className={cx("goda-page relative h-dvh w-full overflow-hidden", skin.pageClass, `tpl-${t.template}`)}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontHref} />
      {css && <style dangerouslySetInnerHTML={{ __html: css.replace(/</g, "") }} />}
      {skin.decor}
      <FrameStudio
        key={v.id}
        campaign={{ ...campaign, id: v.id, slug: v.slug, title: v.title, type: v.type, config: v.config }}
        allowed={v.allowed}
        preview={preview}
        track={track}
        accent={accent}
        embed={embed}
        chrome={{ info, mobileHeader, mobileInfo, mobileFooter, footer, sheet, tabs, dark, surface: skin.surface, button: ds.button === "auto" ? "solid" : ds.button }}
      />
    </div>
  );
}

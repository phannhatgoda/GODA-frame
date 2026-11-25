"use client";
import { useCallback, useEffect, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { FONTS, type CampaignPublic, type FontId, type Theme } from "@/lib/types";
import { FrameStudio, type Allowed } from "./FrameStudio";
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
        ? { backgroundImage: `linear-gradient(${bg}99, ${bg}cc), url(${JSON.stringify(t.coverUrl).slice(1, -1)})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: bg }
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

export function GuestView({ campaign, allowed, poweredBy, preview, embed }: { campaign: CampaignPublic; allowed: Allowed; poweredBy: boolean; preview?: boolean; embed?: boolean }) {
  const t = campaign.theme;
  const bgDark = t.bgStyle === "gradient" ? isDark(t.primary) || isDark(t.background) : isDark(t.background);
  const dark = t.template === "glass" || t.template === "neon" || t.template === "studio" ? true : bgDark;
  const text = t.text;
  const skin = skinFor(t, campaign.type, dark);

  const fontHref = useMemo(() => {
    const ids = new Set<FontId>([t.font, ...campaign.config.texts.map((x) => x.font)]);
    return `https://fonts.googleapis.com/css2?${[...ids].map((i) => "family=" + FONTS[i].google).join("&")}&display=swap`;
  }, [t.font, campaign.config.texts]);

  const track = useCallback(
    (type: string, extra?: Record<string, unknown>) => {
      if (preview) return;
      const body = JSON.stringify({ campaignId: campaign.id, type, visitorId: visitorId(), source: sourceOf(embed), ...extra });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    },
    [campaign.id, preview, embed],
  );

  useEffect(() => {
    if (preview) return;
    const key = "goda_v_" + campaign.id;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    track("view");
  }, [campaign.id, preview, track]);

  // embed: tell the parent page how tall we want to be (widget.js listens)
  useEffect(() => {
    if (!embed) return;
    window.parent?.postMessage({ type: "goda:embed-ready", slug: campaign.slug }, "*");
  }, [embed, campaign.slug]);

  const vars = {
    "--r": `${t.radius}px`,
    ...background(t),
    color: text,
    fontFamily: FONTS[t.font].css,
  } as React.CSSProperties;

  const logo = (cls: string) =>
    t.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={t.logoUrl} alt="Logo" className={cx("w-auto object-contain", cls)} />
    ) : null;

  const links = t.links.length > 0 && (
    <div className="flex flex-wrap gap-2">
      {t.links.map((l, i) => (
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
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.25em]" style={{ color: t.template === "festive" ? t.secondary : t.primary }}>
      <span className="h-px w-6" style={{ background: "currentColor" }} />{skin.eyebrow}
    </div>
  );

  const info = (
    <div className="space-y-4">
      {logo("h-11 max-w-[200px]")}
      {eyebrow}
      <h1 className={cx("text-[34px] leading-[1.08] xl:text-[40px]", skin.headline)} style={t.template === "bold" ? { color: "#fff" } : undefined}>{t.headline}</h1>
      {t.subheadline && <p className="text-[15px] leading-relaxed opacity-75" style={t.template === "bold" ? { color: "#fff" } : undefined}>{t.subheadline}</p>}
      {t.hashtag && <div className="text-sm font-bold" style={{ color: t.template === "festive" ? t.secondary : t.template === "bold" || t.template === "glass" ? "#fff" : t.primary }}>{t.hashtag}</div>}
    </div>
  );

  const mobileHeader = (
    <div className="flex items-center gap-2.5">
      {logo("h-8 max-w-[96px] shrink-0")}
      <div className="min-w-0">
        <h1 className={cx("line-clamp-2 text-[17px] leading-tight", skin.headline)} style={t.template === "bold" ? { color: "#fff" } : undefined}>{t.headline}</h1>
        {t.hashtag && <div className="truncate text-[11px] font-bold" style={{ color: t.template === "festive" ? t.secondary : t.template === "bold" || t.template === "glass" ? "#fff" : t.primary }}>{t.hashtag}</div>}
      </div>
    </div>
  );

  const footer = (
    <div className="space-y-3 text-xs">
      {links}
      {t.footerText && <p className="whitespace-pre-line opacity-60">{t.footerText}</p>}
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

  return (
    <div style={vars} className={cx("relative h-dvh w-full overflow-hidden", skin.pageClass)}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontHref} />
      {skin.decor}
      <FrameStudio
        campaign={campaign}
        allowed={allowed}
        preview={preview}
        track={track}
        accent={t.template === "festive" ? t.secondary : t.primary}
        embed={embed}
        chrome={{ info, mobileHeader, footer, sheet, dark, surface: skin.surface }}
      />
    </div>
  );
}

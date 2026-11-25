"use client";
import { useCallback, useEffect, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { FONTS, type CampaignPublic, type FontId } from "@/lib/types";
import { FrameStudio, type Allowed } from "./FrameStudio";

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

function sourceOf() {
  const q = new URLSearchParams(location.search);
  const s = q.get("utm_source") || q.get("src") || q.get("ref");
  if (s) return s.slice(0, 60);
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

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export function GuestView({ campaign, allowed, poweredBy, preview }: { campaign: CampaignPublic; allowed: Allowed; poweredBy: boolean; preview?: boolean }) {
  const t = campaign.theme;
  const tpl = t.template;
  const studioDark = tpl === "studio";
  const bg = studioDark ? (isDark(t.background) ? t.background : "#0F0F12") : t.background;
  const text = studioDark ? "#F5F5F4" : t.text;
  const dark = isDark(bg);

  const fontHref = useMemo(() => {
    const ids = new Set<FontId>([t.font, ...campaign.config.texts.map((x) => x.font)]);
    return `https://fonts.googleapis.com/css2?${[...ids].map((i) => "family=" + FONTS[i].google).join("&")}&display=swap`;
  }, [t.font, campaign.config.texts]);

  const track = useCallback(
    (type: string, extra?: Record<string, unknown>) => {
      if (preview) return;
      const body = JSON.stringify({ campaignId: campaign.id, type, visitorId: visitorId(), source: sourceOf(), ...extra });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    },
    [campaign.id, preview],
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

  const vars = {
    "--r": `${t.radius}px`,
    "--surface": dark ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.75)",
    "--line": dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)",
    background: bg,
    color: text,
    fontFamily: FONTS[t.font].css,
  } as React.CSSProperties;

  const logo = t.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={t.logoUrl} alt="Logo" className="h-10 w-auto max-w-[180px] object-contain" />
  ) : null;

  const studio = <FrameStudio campaign={campaign} allowed={allowed} preview={preview} track={track} accent={t.primary} />;

  const links = t.links.length > 0 && (
    <div className="flex flex-wrap justify-center gap-2">
      {t.links.map((l, i) => (
        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-[var(--line)] transition hover:opacity-80" style={{ background: "var(--surface)" }}>
          {l.label} <ExternalLink className="size-3.5 opacity-60" />
        </a>
      ))}
    </div>
  );

  const footer = (
    <footer className="mt-12 space-y-4 pb-8 text-center text-xs opacity-70">
      {links}
      {t.footerText && <p className="whitespace-pre-line">{t.footerText}</p>}
      {poweredBy && (
        <a href="/" target="_blank" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium opacity-80 ring-1 ring-[var(--line)]">
          Powered by <b>GODA.Frame</b>
        </a>
      )}
    </footer>
  );

  const hashtag = t.hashtag && <div className="text-sm font-semibold" style={{ color: t.primary }}>{t.hashtag}</div>;

  return (
    <div style={vars} className="relative min-h-dvh overflow-x-hidden">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontHref} />

      {tpl === "aura" && (
        <>
          <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full opacity-40 blur-[100px]" style={{ background: t.primary }} />
          <div className="pointer-events-none absolute -right-40 top-60 size-[420px] rounded-full opacity-25 blur-[100px]" style={{ background: t.primary }} />
          <div className="relative mx-auto max-w-xl px-4 pt-8">
            <div className="flex justify-center">{logo}</div>
            <div className="mt-6 text-center">
              <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">{t.headline}</h1>
              {t.subheadline && <p className="mx-auto mt-3 max-w-md text-[15px] opacity-70">{t.subheadline}</p>}
              <div className="mt-2">{hashtag}</div>
            </div>
            <div className="mt-7">{studio}</div>
            {footer}
          </div>
        </>
      )}

      {tpl === "bold" && (
        <>
          <div className="relative h-[300px] overflow-hidden sm:h-[360px]" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.primary}CC)` }}>
            {t.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="relative mx-auto flex h-full max-w-3xl flex-col justify-between px-5 pb-20 pt-6 text-white">
              <div>{logo && <div className="inline-block rounded-xl bg-white/90 p-2">{logo}</div>}</div>
              <div>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{t.headline}</h1>
                {t.subheadline && <p className="mt-2 max-w-xl text-white/85">{t.subheadline}</p>}
              </div>
            </div>
          </div>
          <div className="relative mx-auto -mt-14 max-w-xl px-4">
            <div className="rounded-[calc(var(--r)*1.2)] p-4 shadow-2xl sm:p-6" style={{ background: dark ? "#18181b" : "#fff" }}>
              <div className="mb-4 text-center">{hashtag}</div>
              {studio}
            </div>
            {footer}
          </div>
        </>
      )}

      {tpl === "studio" && (
        <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="pointer-events-none absolute right-0 top-0 size-[500px] rounded-full opacity-25 blur-[120px]" style={{ background: t.primary }} />
          <div className="relative lg:pr-6">
            {logo && <div className="mb-8">{logo}</div>}
            <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest" style={{ background: t.primary + "26", color: t.primary }}>
              {campaign.type === "invitation" ? "Thư mời" : "Frame avatar"}
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">{t.headline}</h1>
            {t.subheadline && <p className="mt-4 max-w-md text-lg opacity-60">{t.subheadline}</p>}
            <div className="mt-4">{hashtag}</div>
            <div className="mt-8 hidden lg:block">{links}</div>
          </div>
          <div className="relative">
            {studio}
            <div className="lg:hidden">{footer}</div>
          </div>
          <div className="relative hidden pb-4 text-xs opacity-60 lg:col-span-2 lg:block">
            <div className="flex items-center justify-between">
              <span className="whitespace-pre-line">{t.footerText}</span>
              {poweredBy && <a href="/" target="_blank">Powered by <b>GODA.Frame</b></a>}
            </div>
          </div>
        </div>
      )}

      {tpl === "paper" && (
        <div className="relative mx-auto max-w-xl px-4 py-8">
          <div className="rounded-[calc(var(--r)*0.6)] p-1.5 ring-1" style={{ ["--tw-ring-color" as string]: t.primary + "55" }}>
            <div className="rounded-[calc(var(--r)*0.45)] px-4 py-8 ring-1 sm:px-8" style={{ ["--tw-ring-color" as string]: t.primary + "33", background: dark ? "transparent" : "rgba(255,255,255,.55)" }}>
              <div className="flex justify-center">{logo}</div>
              <div className="mt-4 text-center">
                <div className="mx-auto flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[.3em]" style={{ color: t.primary }}>
                  <span className="h-px w-8" style={{ background: t.primary }} />{campaign.type === "invitation" ? "Trân trọng kính mời" : "Cùng tham gia"}<span className="h-px w-8" style={{ background: t.primary }} />
                </div>
                <h1 className="mt-4 text-[32px] leading-tight sm:text-5xl">{t.headline}</h1>
                {t.subheadline && <p className="mx-auto mt-3 max-w-sm italic opacity-70">{t.subheadline}</p>}
                <div className="mt-2">{hashtag}</div>
              </div>
              <div className="mt-8">{studio}</div>
            </div>
          </div>
          {footer}
        </div>
      )}
    </div>
  );
}

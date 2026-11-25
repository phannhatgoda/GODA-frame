"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Camera, Check, ChevronLeft, Copy, Download, ImagePlus, Info, Loader2, Maximize2, Palette, Pencil, RotateCcw, RotateCw, ScanFace, Share2, Sparkles, Wand2, X,
} from "lucide-react";
import { coverScale, emptyPhoto, loadImage, render, type PhotoState } from "@/lib/client/render";
import { FONTS, type FrameConfig, type TextField, type Theme } from "@/lib/types";
import { cx } from "../ui";
import { onColor } from "@/lib/color";

export interface Allowed { face: boolean; background: boolean; filters: boolean; caption: boolean }
type Track = (type: string, extra?: Record<string, unknown>) => void;
type Tool = null | "zoom" | "rotate" | "bg" | "filter";

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Gốc", css: "none" },
  { id: "bright", label: "Tươi sáng", css: "brightness(1.08) contrast(1.05) saturate(1.1)" },
  { id: "warm", label: "Ấm áp", css: "sepia(.18) saturate(1.2) brightness(1.04)" },
  { id: "cool", label: "Mát lạnh", css: "hue-rotate(-8deg) saturate(.95) brightness(1.04) contrast(1.04)" },
  { id: "vivid", label: "Rực rỡ", css: "saturate(1.45) contrast(1.08)" },
  { id: "film", label: "Film", css: "contrast(1.1) saturate(.8) sepia(.12)" },
  { id: "bw", label: "Đen trắng", css: "grayscale(1) contrast(1.12)" },
];

function useFonts(cfg: FrameConfig) {
  const [ready, setReady] = useState(0);
  useEffect(() => {
    let alive = true;
    const loads = cfg.texts.map((t) => document.fonts.load(`${t.weight} ${Math.round(t.fontSize)}px ${FONTS[t.font]?.css}`).catch(() => {}));
    Promise.all(loads).then(() => alive && setReady((x) => x + 1));
    document.fonts.ready.then(() => alive && setReady((x) => x + 1));
    return () => { alive = false; };
  }, [cfg.texts]);
  return ready;
}

/** Height of the on-screen keyboard (iOS keeps the layout viewport, so fixed bars need this offset). */
function useKeyboardOffset(active: boolean) {
  const [o, setO] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) return setO(0);
    const f = () => setO(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    f();
    vv.addEventListener("resize", f);
    vv.addEventListener("scroll", f);
    return () => {
      vv.removeEventListener("resize", f);
      vv.removeEventListener("scroll", f);
    };
  }, [active]);
  return o;
}

function useIsDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const f = () => setD(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return d;
}

/** Largest W:H box that fits inside the element. */
function useFit(ar: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      const w = Math.min(width, height * ar);
      setSize({ w: Math.floor(w), h: Math.floor(w / ar) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ar]);
  return { ref, size };
}

async function fileToCanvas(file: File, max = 2400) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Ảnh không hợp lệ"));
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function textBox(t: TextField) {
  const left = t.align === "center" ? t.x - t.maxWidth / 2 : t.align === "left" ? t.x : t.x - t.maxWidth;
  const h = t.fontSize * 1.5;
  return { x: left, y: t.y - h / 2, w: t.maxWidth, h };
}

export interface StudioChrome {
  /** desktop left column: brand + headline (rendered above the tools) */
  info: React.ReactNode;
  /** mobile top bar */
  mobileHeader: React.ReactNode;
  /** desktop footer: links, footer text, powered by */
  footer: React.ReactNode;
  /** content of the mobile "info" sheet */
  sheet: React.ReactNode;
  dark: boolean;
  /** class for floating surfaces (tool strip, panels) */
  surface: string;
  /** mobile: brand info shown under the header (description, links) */
  mobileInfo?: React.ReactNode;
  /** mobile: tiny footer under the action buttons */
  mobileFooter?: React.ReactNode;
  /** switcher between companion experiences (invitation / avatar…) */
  tabs?: React.ReactNode;
  button: "solid" | "outline" | "pill";
}

/** Zalo, Facebook, Instagram, TikTok… in-app browsers cannot save blob: downloads. */
const IN_APP = /Zalo|FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview|; wv\)/i;

export function FrameStudio({
  campaign, allowed, preview, track, accent, chrome, embed,
}: {
  campaign: { id: string; slug: string; title: string; type: string; config: FrameConfig; theme: Theme };
  allowed: Allowed;
  preview?: boolean;
  track: Track;
  accent: string;
  chrome: StudioChrome;
  embed?: boolean;
}) {
  const cfg = campaign.config;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [frame, setFrame] = useState<HTMLImageElement | null>(null);
  const [frameErr, setFrameErr] = useState(false);
  const [photo, setPhoto] = useState<PhotoState>(emptyPhoto);
  const original = useRef<HTMLCanvasElement | null>(null);
  const cutout = useRef<HTMLCanvasElement | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(cfg.texts.map((t) => [t.id, ""])));
  const [editing, setEditing] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [busy, setBusy] = useState("");
  const [hint, setHint] = useState("");
  const [done, setDone] = useState<{ url: string; blob: Blob; server?: string } | null>(null);
  const [sheet, setSheet] = useState(false);
  const [filterId, setFilterId] = useState("none");
  const fontsReady = useFonts(cfg);
  const isDesktop = useIsDesktop();
  const kb = useKeyboardOffset(!!editing && !isDesktop);
  const [hl, setHl] = useState<string | null>(null); // field focused in the desktop side panel
  const { ref: fitRef, size } = useFit(cfg.width / cfg.height);
  const scale = size.w / cfg.width; // css px per frame px

  useEffect(() => {
    setFrameErr(false);
    if (!cfg.frameUrl) return setFrame(null);
    loadImage(cfg.frameUrl).then(setFrame).catch(() => setFrameErr(true));
  }, [cfg.frameUrl]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const id = requestAnimationFrame(() => render(c.getContext("2d")!, cfg, { frame, photo, values }));
    return () => cancelAnimationFrame(id);
  }, [cfg, frame, photo, values, fontsReady, editing]);

  const flash = useCallback((t: string) => {
    setHint(t);
    setTimeout(() => setHint((h) => (h === t ? "" : h)), 2600);
  }, []);

  /* ---------- AI ---------- */
  const autoFace = useCallback(
    async (src: HTMLCanvasElement, silent = false) => {
      if (!allowed.face || !cfg.photo.enabled) return;
      setBusy("AI đang tìm khuôn mặt…");
      try {
        const { detectFace } = await import("@/lib/client/ai");
        const f = await detectFace(src);
        if (!f) {
          if (!silent) flash("Không thấy khuôn mặt — kéo ảnh để căn chỉnh");
          return;
        }
        const { w, h } = cfg.photo;
        const target = Math.min(w, h) * (cfg.photo.shape === "circle" ? 0.4 : 0.34);
        const base = coverScale(cfg, src.width, src.height);
        const sc = Math.max(1, Math.min(4, target / f.w / base));
        const s = base * sc;
        const fcx = f.x + f.w / 2, fcy = f.y + f.h / 2;
        let dx = -(fcx - src.width / 2) * s;
        let dy = -(fcy - src.height / 2) * s - h * 0.04;
        const mx = Math.max(0, (src.width * s - w) / 2), my = Math.max(0, (src.height * s - h) / 2);
        dx = Math.max(-mx, Math.min(mx, dx));
        dy = Math.max(-my, Math.min(my, dy));
        setPhoto((p) => ({ ...p, scale: sc, dx, dy, rotate: 0 }));
        track("ai_face");
        flash(f.count > 1 ? `Thấy ${f.count} khuôn mặt — đã căn người lớn nhất ✨` : "AI đã căn khuôn mặt vào khung ✨");
      } catch (e) {
        console.warn(e);
        if (!silent) flash("Không tải được AI, bạn có thể căn thủ công");
      } finally {
        setBusy("");
      }
    },
    [allowed.face, cfg, flash, track],
  );

  async function setBackground(mode: "none" | "color" | "blur", color?: string) {
    if (!original.current) return;
    if (mode === "none") return setPhoto((p) => ({ ...p, img: original.current, bg: { ...p.bg, mode: "none" } }));
    if (!cutout.current) {
      setBusy("AI đang tách nền…");
      try {
        const { removeBackground } = await import("@/lib/client/ai");
        cutout.current = await removeBackground(original.current);
        track("ai_bg");
      } catch (e) {
        console.warn(e);
        flash("Không tách được nền trên thiết bị này");
        setBusy("");
        return;
      }
      setBusy("");
    }
    setPhoto((p) => ({ ...p, img: cutout.current, bg: { mode, color: color || p.bg.color || cfg.bgFill, source: original.current } }));
  }

  async function onFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return flash("Vui lòng chọn file ảnh");
    setBusy("Đang xử lý ảnh…");
    try {
      await applyPhoto(await fileToCanvas(file));
    } catch (e) {
      setBusy("");
      flash((e as Error).message);
    }
  }

  async function applyPhoto(c: HTMLCanvasElement) {
    setBusy("Đang xử lý ảnh…");
    try {
      original.current = c;
      cutout.current = null;
      setFilterId("none");
      setTool(null);
      setPhoto({ ...emptyPhoto(), img: c, natW: c.width, natH: c.height, bg: { mode: "none", color: accent, source: null } });
      track("upload");
      setBusy("");
      await autoFace(c, true);
    } catch (e) {
      setBusy("");
      flash((e as Error).message);
    }
  }

  const [camera, setCamera] = useState(false);
  function openCamera() {
    // live in-page camera where supported; native camera picker as fallback (older / in-app browsers)
    if (typeof navigator.mediaDevices?.getUserMedia === "function" && window.isSecureContext) setCamera(true);
    else camRef.current?.click();
  }

  useEffect(() => {
    if (preview || !allowed.face) return;
    const t = setTimeout(() => import("@/lib/client/ai").then((m) => m.warmup("face")), 1500);
    return () => clearTimeout(t);
  }, [preview, allowed.face]);

  /* ---------- Gestures on the photo ---------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; mx: number; my: number } | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    if (!photo.img) return; // only the photo-slot button opens the picker
    setEditing(null);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const r = 1 / (scale || 1);
    if (pointers.current.size === 1) {
      setPhoto((p) => ({ ...p, dx: p.dx + (cur.x - prev.x) * r, dy: p.dy + (cur.y - prev.y) * r }));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const k = d / pinch.current.d;
      const ddx = (mx - pinch.current.mx) * r, ddy = (my - pinch.current.my) * r;
      pinch.current = { d, mx, my };
      setPhoto((p) => ({ ...p, scale: Math.max(0.4, Math.min(6, p.scale * k)), dx: p.dx + ddx, dy: p.dy + ddy }));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const wheel = (e: WheelEvent) => {
      if (!photo.img) return;
      e.preventDefault();
      setPhoto((p) => ({ ...p, scale: Math.max(0.4, Math.min(6, p.scale * (e.deltaY < 0 ? 1.06 : 0.94))) }));
    };
    c.addEventListener("wheel", wheel, { passive: false });
    return () => c.removeEventListener("wheel", wheel);
  }, [photo.img]);

  /* ---------- Export ---------- */
  const missing = cfg.texts.filter((t) => t.required && !values[t.id]?.trim());
  const needPhoto = cfg.photo.enabled && !photo.img && campaign.type === "avatar";
  const canExport = !needPhoto && missing.length === 0 && !!frame;

  async function makeBlob(forceJpeg = false) {
    await Promise.all(cfg.texts.map((t) => document.fonts.load(`${t.weight} ${Math.round(t.fontSize)}px ${FONTS[t.font]?.css}`).catch(() => {})));
    const c = document.createElement("canvas");
    c.width = cfg.width;
    c.height = cfg.height;
    render(c.getContext("2d")!, cfg, { frame, photo, values });
    const type = forceJpeg || cfg.format === "jpg" ? "image/jpeg" : "image/png";
    return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("export"))), type, 0.93));
  }
  const fileName = () => {
    const n = Object.values(values).filter(Boolean).join("-");
    const base = `${campaign.slug}${n ? "-" + n : ""}`
      .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase();
    return `${base}.${cfg.format === "jpg" ? "jpg" : "png"}`;
  };

  async function download() {
    setEditing(null);
    if (!canExport) {
      if (needPhoto) {
        flash("Chạm vào khung để thêm ảnh của bạn");
      } else if (missing[0]) {
        flash(`Chạm vào ô “${missing[0].label}” để nhập`);
        setEditing(missing[0].id);
      }
      return;
    }
    setBusy("Đang xuất ảnh chất lượng cao…");
    try {
      let blob = await makeBlob();
      if (!preview && IN_APP.test(navigator.userAgent)) {
        // in-app browser: park the file on the server and download it from a real URL
        if (blob.size > 3.8 * 1024 * 1024) blob = await makeBlob(true);
        const name = fileName().replace(/\.png$/, blob.type === "image/jpeg" ? ".jpg" : ".png");
        const r = await fetch(`/api/dl?campaignId=${encodeURIComponent(campaign.id)}&name=${encodeURIComponent(name)}`, { method: "POST", body: blob, headers: { "Content-Type": blob.type } });
        const d = (await r.json()) as { url?: string };
        if (d.url) {
          setDone({ url: d.url + "?inline=1", blob, server: d.url });
          track("download", { names: cfg.collectNames ? values : undefined });
          setTimeout(() => (location.href = d.url!), 150);
          return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDone({ url, blob });
      track("download", { names: cfg.collectNames ? values : undefined });
    } finally {
      setBusy("");
    }
  }

  async function share(blob?: Blob) {
    try {
      const b = blob || (await makeBlob());
      const file = new File([b], fileName(), { type: b.type });
      const text = [campaign.theme.caption, campaign.theme.hashtag].filter(Boolean).join("\n\n");
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: campaign.title, text });
        track("share");
      } else {
        await navigator.clipboard?.writeText(location.href);
        flash("Đã sao chép link — dán vào bài đăng của bạn");
        track("share");
      }
    } catch {}
  }

  const hasPhoto = cfg.photo.enabled && !!photo.img;
  const accentInk = onColor(accent);
  const surface = chrome.surface;

  /* ---------- pieces ---------- */
  const canvasBox = (
    <div ref={fitRef} className="relative flex min-h-0 w-full flex-1 items-center justify-center">
      {size.w > 0 && (
        <div className="relative" style={{ width: size.w, height: size.h }}>
          <div className="checker absolute inset-0 overflow-hidden shadow-[0_24px_60px_-24px_rgb(0_0_0/.5)]" style={{ borderRadius: "calc(var(--r) * .6)" }}>
            <canvas
              ref={canvasRef}
              width={cfg.width}
              height={cfg.height}
              className={cx("absolute inset-0 size-full touch-none", photo.img && "cursor-grab active:cursor-grabbing")}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {!frame && !frameErr && <div className="shimmer absolute inset-0" />}
            {frameErr && <div className="absolute inset-0 grid place-items-center bg-white/80 text-sm text-stone-700">Chưa có frame cho chiến dịch này</div>}
          </div>

          {/* tap-to-add photo hotspot */}
          {cfg.photo.enabled && !photo.img && frame && (
            <button
              onClick={() => fileRef.current?.click()}
              className="group absolute grid place-items-center"
              style={{ left: cfg.photo.x * scale, top: cfg.photo.y * scale, width: cfg.photo.w * scale, height: cfg.photo.h * scale, borderRadius: cfg.photo.shape === "circle" ? "9999px" : 12 }}
            >
              <span className="absolute inset-[4%] border-2 border-dashed border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,.15)]" style={{ borderRadius: cfg.photo.shape === "circle" ? "9999px" : 12 }} />
              <span
                className="relative grid place-items-center rounded-full bg-white/95 shadow-lift transition group-active:scale-90"
                style={{ width: Math.max(40, Math.min(60, Math.min(cfg.photo.w, cfg.photo.h) * scale * 0.24)), height: Math.max(40, Math.min(60, Math.min(cfg.photo.w, cfg.photo.h) * scale * 0.24)) }}
                aria-label="Thêm ảnh"
              >
                <ImagePlus className="size-1/2" style={{ color: accent }} />
                <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: accent }} />
              </span>
            </button>
          )}

          {/* tap-to-edit text hotspots */}
          {frame &&
            cfg.texts.map((t) => {
              const b = textBox(t);
              const val = values[t.id] || "";
              const isEditing = editing === t.id || hl === t.id;
              if (isDesktop && editing === t.id) {
                const idx = cfg.texts.findIndex((x) => x.id === t.id);
                const next = cfg.texts[idx + 1];
                const h = Math.max(44, Math.min(64, b.h * scale));
                return (
                  <input
                    key={t.id}
                    autoFocus
                    value={val}
                    maxLength={60}
                    placeholder={t.placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value }))}
                    onBlur={() => setEditing((cur) => (cur === t.id ? null : cur))}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditing(null);
                      if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey && next)) { e.preventDefault(); setEditing(next && e.key === "Tab" ? next.id : e.key === "Enter" && next ? next.id : null); }
                    }}
                    className="absolute z-20 rounded-xl border-2 bg-white px-3 font-semibold text-stone-900 shadow-2xl outline-none placeholder:font-normal placeholder:text-stone-400"
                    style={{
                      left: b.x * scale - 4, width: b.w * scale + 8, top: (b.y + b.h / 2) * scale - h / 2, height: h,
                      borderColor: accent, textAlign: t.align, fontSize: Math.max(15, Math.min(22, h * 0.42)),
                      fontFamily: FONTS[t.font].css,
                    }}
                  />
                );
              }
              const style = { left: b.x * scale, top: b.y * scale, width: b.w * scale, height: b.h * scale };
              return (
                <button
                  key={t.id}
                  onClick={() => setEditing(t.id)}
                  className={cx("group absolute z-10 rounded-lg transition", isEditing ? "ring-[3px] ring-offset-2 ring-offset-transparent" : !val && "border-2 border-dashed border-current/50 bg-white/30")}
                  style={{ ...style, color: t.color, ...(isEditing ? { ["--tw-ring-color" as string]: accent, background: "rgba(255,255,255,.08)" } : {}) }}
                  aria-label={`Sửa ${t.label}`}
                >
                  {!val && !isEditing && (
                    <span className="absolute inset-0 flex items-center justify-center gap-1.5 px-2 text-[13px] font-semibold" style={{ fontSize: Math.min(15, Math.max(12, t.fontSize * scale * 0.45)) }}>
                      <Pencil className="size-3.5 shrink-0" /> <span className="truncate">Chạm để nhập {t.label.toLowerCase()}</span>
                    </span>
                  )}
                  {val && !isEditing && <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-white text-stone-700 opacity-80 shadow-md group-hover:opacity-100"><Pencil className="size-3" /></span>}
                </button>
              );
            })}

          {busy && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
              <span className="flex items-center gap-2 rounded-full bg-black/75 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur"><Loader2 className="size-3.5 animate-spin" />{busy}</span>
            </div>
          )}
          {hint && !busy && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
              <span className="animate-pop rounded-full bg-black/75 px-3.5 py-1.5 text-center text-xs font-medium text-white backdrop-blur">{hint}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const bgOptions = (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
      {[
        { m: "none" as const, label: "Gốc" },
        { m: "blur" as const, label: "Xoá phông" },
        { m: "color" as const, label: "Thay nền" },
      ].map((o) => (
        <button key={o.m} onClick={() => setBackground(o.m)} className={cx("h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold transition", photo.bg.mode !== o.m && "bg-black/10")} style={photo.bg.mode === o.m ? { background: accent, color: accentInk } : undefined}>
          {o.label}
        </button>
      ))}
      {photo.bg.mode === "color" &&
        [accent, cfg.bgFill, "#FFFFFF", "#111111", "#F5E6D3", "#DCEBFF", "#FDE2E4"].map((c, i) => (
          <button key={c + i} onClick={() => setBackground("color", c)} className={cx("size-8 shrink-0 rounded-full ring-2 ring-offset-1 transition", photo.bg.color === c ? "ring-current" : "ring-transparent")} style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)" }} />
        ))}
    </div>
  );

  const filterOptions = (
    <div className="flex gap-2 overflow-x-auto scrollbar-none">
      {FILTERS.map((f) => (
        <button key={f.id} onClick={() => { setFilterId(f.id); setPhoto((p) => ({ ...p, filter: f.css })); }} className="shrink-0 text-center">
          <span className={cx("block size-11 overflow-hidden rounded-xl ring-2 transition", filterId !== f.id && "ring-transparent")} style={filterId === f.id ? { ["--tw-ring-color" as string]: accent } : undefined}>
            <FilterThumb src={original.current} css={f.css} />
          </span>
          <span className="mt-0.5 block text-[10px] font-medium">{f.label}</span>
        </button>
      ))}
    </div>
  );

  const slider = (kind: "zoom" | "rotate") => (
    <label className="flex w-full items-center gap-3 text-xs font-semibold">
      <span className="w-14 shrink-0 opacity-70">{kind === "zoom" ? "Phóng to" : "Xoay"}</span>
      {kind === "zoom" ? (
        <input type="range" min={0.4} max={4} step={0.01} value={photo.scale} onChange={(e) => setPhoto((p) => ({ ...p, scale: +e.target.value }))} className="flex-1" style={{ accentColor: accent }} />
      ) : (
        <input type="range" min={-45} max={45} step={0.5} value={photo.rotate} onChange={(e) => setPhoto((p) => ({ ...p, rotate: +e.target.value }))} className="flex-1" style={{ accentColor: accent }} />
      )}
    </label>
  );

  const chips: { id: string; label: string; icon: typeof ImagePlus; on: boolean; act: () => void }[] = [
    { id: "change", label: "Đổi ảnh", icon: ImagePlus, on: cfg.photo.enabled, act: () => fileRef.current?.click() },
    { id: "selfie", label: "Selfie", icon: Camera, on: cfg.photo.enabled, act: () => openCamera() },
    { id: "face", label: "Căn mặt AI", icon: ScanFace, on: hasPhoto && allowed.face, act: () => original.current && autoFace(original.current) },
    { id: "bg", label: "Nền AI", icon: Wand2, on: hasPhoto && allowed.background, act: () => setTool("bg") },
    { id: "filter", label: "Bộ lọc", icon: Palette, on: hasPhoto && allowed.filters, act: () => setTool("filter") },
    { id: "zoom", label: "Phóng to", icon: Maximize2, on: hasPhoto, act: () => setTool("zoom") },
    { id: "rotate", label: "Xoay", icon: RotateCw, on: hasPhoto, act: () => setTool("rotate") },
    { id: "reset", label: "Đặt lại", icon: RotateCcw, on: hasPhoto, act: () => setPhoto((p) => ({ ...p, scale: 1, dx: 0, dy: 0, rotate: 0 })) },
  ];

  /** mobile: one fixed-height strip — chips, or the active tool's controls */
  const strip = (
    <div className={cx("mx-3 flex h-[68px] items-center rounded-[calc(var(--r)*.8)] px-2", surface)}>
      {tool ? (
        <div className="flex w-full items-center gap-2">
          <button onClick={() => setTool(null)} className="grid size-9 shrink-0 place-items-center rounded-full bg-black/10" aria-label="Quay lại"><ChevronLeft className="size-5" /></button>
          <div className="min-w-0 flex-1">
            {tool === "zoom" && slider("zoom")}
            {tool === "rotate" && slider("rotate")}
            {tool === "bg" && bgOptions}
            {tool === "filter" && filterOptions}
          </div>
        </div>
      ) : cfg.photo.enabled && !photo.img ? (
        <p className="w-full px-2 text-center text-[13px] font-medium opacity-75">
          {cfg.texts.length ? "Chạm vào khung để thêm ảnh, chạm vào ô chữ để nhập" : "Chạm vào khung để thêm ảnh — AI tự căn khuôn mặt"}
        </p>
      ) : !cfg.photo.enabled ? (
        <p className="w-full px-2 text-center text-[13px] font-medium opacity-75">Chạm trực tiếp vào ô trên thiệp để nhập thông tin</p>
      ) : (
        <div className="flex w-full gap-1 overflow-x-auto scrollbar-none">
          {chips.filter((c) => c.on).map((c) => (
            <button key={c.id} onClick={c.act} className="flex w-[62px] shrink-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-semibold transition active:scale-95 active:bg-black/10">
              <c.icon className="size-5" style={c.id === "face" || c.id === "bg" ? { color: accent } : undefined} />
              <span className="whitespace-nowrap">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const actions = (
    <div className="flex gap-2">
      <button
        onClick={download}
        className={cx("flex h-[52px] flex-1 items-center justify-center gap-2 text-[15px] font-semibold transition active:scale-[.98]", chrome.button === "pill" ? "rounded-full" : "rounded-[calc(var(--r)*.7)]", !canExport && "opacity-70")}
        style={chrome.button === "outline" ? { border: `2px solid ${accent}`, color: accent, background: "transparent" } : { background: accent, color: accentInk, boxShadow: `0 12px 28px -12px ${accent}` }}
      >
        <Download className="size-5" /> {campaign.type === "invitation" ? "Tải thiệp về" : "Tải ảnh về"}
      </button>
      <button onClick={() => (canExport ? share() : download())} className={cx("grid w-[52px] place-items-center transition active:scale-[.98]", chrome.button === "pill" ? "rounded-full" : "rounded-[calc(var(--r)*.7)]", surface)} aria-label="Chia sẻ">
        <Share2 className="size-5" />
      </button>
    </div>
  );

  /** desktop: everything visible at once in the side column */
  const desktopTools = (
    <div className={cx("space-y-4 rounded-[var(--r)] p-4", surface)}>
      {cfg.texts.length > 0 && (
        <div className="space-y-2">
          {cfg.texts.map((t) => (
            <label key={t.id} className="block rounded-xl bg-black/5 px-3 pb-2 pt-2 transition focus-within:bg-white focus-within:ring-2" style={{ ["--tw-ring-color" as string]: accent }}>
              <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-60">{t.label}{t.required && " *"}</span>
              <input
                value={values[t.id] || ""}
                maxLength={60}
                placeholder={t.placeholder}
                onFocus={() => setHl(t.id)}
                onBlur={() => setHl((h) => (h === t.id ? null : h))}
                onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value }))}
                className="mt-0.5 w-full bg-transparent text-[15px] font-medium outline-none placeholder:opacity-50 focus:text-stone-900"
              />
            </label>
          ))}
        </div>
      )}
      {cfg.photo.enabled && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => fileRef.current?.click()} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-black/5 text-sm font-semibold hover:bg-black/10"><ImagePlus className="size-4" />{photo.img ? "Đổi ảnh" : "Chọn ảnh"}</button>
          <button onClick={() => openCamera()} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-black/5 text-sm font-semibold hover:bg-black/10"><Camera className="size-4" />Selfie</button>
        </div>
      )}
      {hasPhoto && (
        <>
          <div className="space-y-2.5">{slider("zoom")}{slider("rotate")}</div>
          <div className="flex gap-2">
            {allowed.face && <button onClick={() => original.current && autoFace(original.current)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-black/5 text-xs font-semibold hover:bg-black/10"><ScanFace className="size-4" style={{ color: accent }} />AI căn mặt</button>}
            <button onClick={() => setPhoto((p) => ({ ...p, scale: 1, dx: 0, dy: 0, rotate: 0 }))} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-black/5 text-xs font-semibold hover:bg-black/10"><RotateCcw className="size-3.5" />Đặt lại</button>
          </div>
          {allowed.background && <div><div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-60">Nền AI</div>{bgOptions}</div>}
          {allowed.filters && <div><div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-60">Bộ lọc</div>{filterOptions}</div>}
        </>
      )}
      {!photo.img && cfg.photo.enabled && <p className="text-center text-xs opacity-60">Hoặc bấm trực tiếp vào khung bên phải</p>}
    </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col lg:flex-row">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />

      {/* desktop column */}
      <aside className="relative z-10 hidden min-h-0 w-[400px] shrink-0 flex-col gap-5 overflow-y-auto px-8 py-8 scrollbar-none lg:flex xl:w-[440px]">
        {!embed && chrome.info}
        {chrome.tabs}
        {desktopTools}
        {actions}
        {!embed && <div className="mt-auto">{chrome.footer}</div>}
      </aside>

      {/* mobile + canvas */}
      <section className="relative z-10 flex min-h-0 flex-1 flex-col">
        {!embed && (
          <div className="flex items-center gap-2 px-4 pb-1 pt-[max(env(safe-area-inset-top),10px)] lg:hidden">
            <div className="min-w-0 flex-1">{chrome.mobileHeader}</div>
            <button onClick={() => setSheet(true)} className={cx("grid size-9 shrink-0 place-items-center rounded-full", surface)} aria-label="Thông tin"><Info className="size-[18px]" /></button>
          </div>
        )}
        {!embed && !editing && chrome.mobileInfo && <div className="px-4 lg:hidden">{chrome.mobileInfo}</div>}
        {chrome.tabs && <div className="px-4 pt-2 lg:hidden">{chrome.tabs}</div>}
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3 lg:px-10 lg:py-8">{canvasBox}</div>
        <div className="space-y-2 pb-[max(env(safe-area-inset-bottom),10px)] lg:hidden">
          {strip}
          <div className="px-3">{actions}</div>
          {!embed && chrome.mobileFooter && <div className="px-4">{chrome.mobileFooter}</div>}
        </div>
      </section>

      {editing && !isDesktop && (() => {
        const idx = cfg.texts.findIndex((t) => t.id === editing);
        const t = cfg.texts[idx];
        if (!t) return null;
        const next = cfg.texts[idx + 1];
        const val = values[t.id] || "";
        return (
          <div className="fixed inset-x-0 z-[70] px-2 pb-2 lg:inset-x-auto lg:right-10 lg:w-[460px]" style={{ bottom: kb }}>
            <div className="animate-in rounded-2xl bg-white p-3 text-stone-900 shadow-[0_-8px_40px_-8px_rgb(0_0_0/.35)] ring-1 ring-black/5">
              <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-semibold text-stone-500">
                <span>{t.label}{t.required && " *"}{cfg.texts.length > 1 && <span className="font-normal"> · {idx + 1}/{cfg.texts.length}</span>}</span>
                <span className="tabular-nums font-normal">{val.length}/60</span>
              </div>
              <div className="flex gap-2">
                <input
                  key={t.id}
                  autoFocus
                  value={val}
                  maxLength={60}
                  placeholder={t.placeholder}
                  enterKeyHint={next ? "next" : "done"}
                  autoComplete={t.id === "name" ? "name" : "off"}
                  autoCapitalize="words"
                  onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setEditing(next ? next.id : null); } }}
                  onBlur={(e) => { if (!(e.relatedTarget as HTMLElement | null)?.closest("[data-editor-bar]")) setTimeout(() => setEditing((cur) => (cur === t.id ? null : cur)), 120); }}
                  className="h-12 min-w-0 flex-1 rounded-xl border-2 border-stone-200 bg-white px-3.5 text-[17px] font-medium text-stone-900 outline-none placeholder:text-stone-400 focus:border-current"
                  style={{ color: "#17120E", borderColor: accent }}
                />
                <button
                  data-editor-bar
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setEditing(next ? next.id : null)}
                  className="h-12 shrink-0 rounded-xl px-4 text-sm font-semibold"
                  style={{ background: accent, color: accentInk }}
                >
                  {next ? "Tiếp" : "Xong"}
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[11px] text-stone-400">Chữ hiển thị trực tiếp trên thiệp và tự co cho vừa khung.</p>
            </div>
          </div>
        );
      })()}

      {camera && (
        <CameraModal
          accent={accent}
          onClose={() => setCamera(false)}
          onFallback={() => { setCamera(false); camRef.current?.click(); }}
          onShot={(c) => { setCamera(false); applyPhoto(c); }}
        />
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSheet(false)}>
          <div className="animate-in max-h-[80dvh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 text-stone-900" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-300" />
            {chrome.sheet}
          </div>
        </div>
      )}

      {done && <DoneSheet campaign={campaign} done={done} server={done.server} allowCaption={allowed.caption} name={Object.values(values).find(Boolean)} accent={accent} onClose={() => setDone(null)} onShare={() => share(done.blob)} track={track} preview={preview} />}
    </div>
  );
}

function CameraModal({ accent, onClose, onShot, onFallback }: { accent: string; onClose: () => void; onShot: (c: HTMLCanvasElement) => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [count, setCount] = useState(0);
  const [timer, setTimer] = useState(false);
  const [canFlip, setCanFlip] = useState(false);
  const fallback = useRef(onFallback);
  fallback.current = onFallback;

  useEffect(() => {
    let alive = true;
    setReady(false);
    (async () => {
      try {
        stream.current?.getTracks().forEach((t) => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false });
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setReady(true);
        const devs = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setCanFlip(devs.filter((d) => d.kind === "videoinput").length > 1);
      } catch (e) {
        const name = (e as DOMException)?.name;
        if (name === "NotAllowedError") setErr("Bạn chưa cho phép dùng camera. Hãy bật quyền camera cho trang này trong cài đặt trình duyệt.");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setErr("Không tìm thấy camera trên thiết bị này.");
        else fallback.current();
      }
    })();
    return () => { alive = false; };
  }, [facing]);
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  function snap() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const x = c.getContext("2d")!;
    if (facing === "user") { x.translate(c.width, 0); x.scale(-1, 1); } // keep the mirror image people saw
    x.drawImage(v, 0, 0);
    stream.current?.getTracks().forEach((t) => t.stop());
    onShot(c);
  }
  function shoot() {
    if (!timer) return snap();
    let n = 3;
    setCount(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(id); setCount(0); snap(); } else setCount(n);
    }, 1000);
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/10" aria-label="Đóng"><X className="size-5" /></button>
        <span className="text-sm font-semibold">Chụp selfie</span>
        <button onClick={() => setTimer((t) => !t)} className={cx("rounded-full px-3 py-2 text-xs font-semibold", timer ? "bg-white text-black" : "bg-white/10")}>⏱ 3s</button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {err ? (
          <div className="max-w-sm px-6 text-center text-sm">
            <p>{err}</p>
            <button onClick={onFallback} className="mt-4 rounded-full bg-white px-4 py-2 font-semibold text-black">Dùng ứng dụng camera / chọn ảnh</button>
          </div>
        ) : (
          <>
            <video ref={video} playsInline muted className={cx("max-h-full max-w-full object-contain", facing === "user" && "-scale-x-100")} />
            {!ready && <Loader2 className="absolute size-8 animate-spin" />}
            {count > 0 && <span className="absolute text-8xl font-bold drop-shadow-lg">{count}</span>}
            <div className="pointer-events-none absolute inset-[12%] rounded-full border-2 border-dashed border-white/40 sm:inset-x-[30%]" />
          </>
        )}
      </div>
      {!err && (
        <div className="flex items-center justify-around px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-5">
          <span className="w-12" />
          <button onClick={shoot} disabled={!ready || count > 0} aria-label="Chụp" className="grid size-20 place-items-center rounded-full border-4 border-white disabled:opacity-40">
            <span className="size-16 rounded-full transition active:scale-90" style={{ background: accent }} />
          </button>
          {canFlip ? (
            <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} className="grid size-12 place-items-center rounded-full bg-white/10" aria-label="Đổi camera"><RotateCw className="size-5" /></button>
          ) : <span className="w-12" />}
        </div>
      )}
    </div>
  );
}

function FilterThumb({ src, css }: { src: HTMLCanvasElement | null; css: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !src) return;
    const x = c.getContext("2d")!;
    const s = Math.max(96 / src.width, 96 / src.height);
    x.filter = css;
    x.drawImage(src, (96 - src.width * s) / 2, (96 - src.height * s) / 2, src.width * s, src.height * s);
  }, [src, css]);
  return <canvas ref={ref} width={96} height={96} className="size-full bg-stone-300" />;
}

function DoneSheet({ campaign, done, server, allowCaption, name, accent, onClose, onShare, track, preview }: {
  campaign: { id: string; title: string; theme: Theme };
  done: { url: string };
  server?: string;
  allowCaption: boolean;
  name?: string;
  accent: string;
  onClose: () => void;
  onShare: () => void;
  track: Track;
  preview?: boolean;
}) {
  const base = useMemo(() => [campaign.theme.caption, campaign.theme.hashtag].filter(Boolean).join("\n\n"), [campaign.theme]);
  const [captions, setCaptions] = useState<string[]>(base ? [base] : []);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(-1);

  async function gen() {
    if (preview) return setCaptions(["(Xem trước) Caption AI sẽ hiển thị tại đây khi trang được xuất bản."]);
    setLoading(true);
    try {
      const r = await fetch("/api/ai/caption", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id, name }) });
      const d = await r.json();
      if (d.captions) {
        setCaptions((c) => [...new Set([...d.captions, ...c])]);
        track("caption");
      }
    } finally {
      setLoading(false);
    }
  }
  async function copy(t: string, i: number) {
    await navigator.clipboard?.writeText(t);
    setCopied(i);
    setTimeout(() => setCopied(-1), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="animate-in max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-5 text-stone-900 shadow-2xl sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold"><span className="grid size-7 place-items-center rounded-full text-white" style={{ background: accent }}><Check className="size-4" /></span>Đã lưu ảnh!</div>
            <p className="mt-1 text-sm text-stone-500">{server ? "Nếu chưa thấy ảnh trong máy: nhấn giữ ảnh bên dưới → Lưu ảnh." : "Không thấy file? Nhấn giữ ảnh bên dưới để lưu vào máy."}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5"><X className="size-5" /></button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={done.url} alt="Ảnh của bạn" className="mx-auto mt-4 max-h-[34dvh] rounded-2xl shadow-lg" />
        {server && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={server} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-stone-100 text-sm font-semibold"><Download className="size-4" /> Tải lại</a>
            {/Android/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "") ? (
              <a href={`intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`} className="flex h-11 items-center justify-center rounded-xl bg-stone-100 text-sm font-semibold">Mở bằng Chrome</a>
            ) : (
              <span className="flex items-center justify-center rounded-xl bg-stone-100 px-2 text-center text-[11px] leading-tight text-stone-600">Bấm ••• góc trên → Mở bằng trình duyệt</span>
            )}
          </div>
        )}
        <button onClick={onShare} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white" style={{ background: accent }}>
          <Share2 className="size-5" /> Chia sẻ lên mạng xã hội
        </button>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Caption gợi ý</span>
            {allowCaption && (
              <button onClick={gen} disabled={loading} className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" style={{ color: accent }} />} AI viết caption
              </button>
            )}
          </div>
          {captions.length === 0 && <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-500">{allowCaption ? "Nhấn “AI viết caption” để nhận 3 gợi ý." : "Hãy viết vài dòng thật “chất” khi đăng ảnh nhé!"}</p>}
          <div className="space-y-2">
            {captions.map((c, i) => (
              <div key={i} className="relative rounded-xl bg-stone-50 p-3 pr-11 text-sm whitespace-pre-line">
                {c}
                <button onClick={() => copy(c, i)} className="absolute right-2 top-2 rounded-lg bg-white p-1.5 shadow-sm" aria-label="Sao chép">
                  {copied === i ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Copy, Download, ImagePlus, Loader2, RotateCcw, ScanFace, Share2, Sparkles, SlidersHorizontal, Wand2, X, Palette, Type } from "lucide-react";
import { coverScale, emptyPhoto, loadImage, render, type PhotoState } from "@/lib/client/render";
import { FONTS, type FrameConfig, type Theme } from "@/lib/types";
import { cx } from "../ui";

export interface Allowed { face: boolean; background: boolean; filters: boolean; caption: boolean }
type Track = (type: string, extra?: Record<string, unknown>) => void;

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
    return () => {
      alive = false;
    };
  }, [cfg.texts]);
  return ready;
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

export function FrameStudio({
  campaign,
  allowed,
  preview,
  track,
  accent,
}: {
  campaign: { id: string; slug: string; title: string; type: string; config: FrameConfig; theme: Theme };
  allowed: Allowed;
  preview?: boolean;
  track: Track;
  accent: string;
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
  const [tab, setTab] = useState<"adjust" | "bg" | "filter">("adjust");
  const [busy, setBusy] = useState<string>("");
  const [hint, setHint] = useState("");
  const [done, setDone] = useState<{ url: string; blob: Blob } | null>(null);
  const fontsReady = useFonts(cfg);
  const [filterId, setFilterId] = useState("none");

  useEffect(() => {
    setFrameErr(false);
    if (!cfg.frameUrl) return setFrame(null);
    loadImage(cfg.frameUrl).then(setFrame).catch(() => setFrameErr(true));
  }, [cfg.frameUrl]);

  // render
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const id = requestAnimationFrame(() => render(c.getContext("2d")!, cfg, { frame, photo, values, guides: false }));
    return () => cancelAnimationFrame(id);
  }, [cfg, frame, photo, values, fontsReady]);

  const flash = useCallback((t: string) => {
    setHint(t);
    setTimeout(() => setHint((h) => (h === t ? "" : h)), 2600);
  }, []);

  /* ---------- AI ---------- */
  const autoFace = useCallback(
    async (src: HTMLCanvasElement, silent = false) => {
      if (!allowed.face || !cfg.photo.enabled) return;
      setBusy("Đang nhận diện khuôn mặt…");
      try {
        const { detectFace } = await import("@/lib/client/ai");
        const f = await detectFace(src);
        if (!f) {
          if (!silent) flash("Không tìm thấy khuôn mặt — hãy kéo để căn chỉnh");
          return;
        }
        const { w, h } = cfg.photo;
        const target = Math.min(w, h) * (cfg.photo.shape === "circle" ? 0.4 : 0.34);
        const base = coverScale(cfg, src.width, src.height);
        const scale = Math.max(1, Math.min(4, target / f.w / base));
        const s = base * scale;
        const fcx = f.x + f.w / 2, fcy = f.y + f.h / 2;
        let dx = -(fcx - src.width / 2) * s;
        let dy = -(fcy - src.height / 2) * s - h * 0.04;
        const mx = Math.max(0, (src.width * s - w) / 2), my = Math.max(0, (src.height * s - h) / 2);
        dx = Math.max(-mx, Math.min(mx, dx));
        dy = Math.max(-my, Math.min(my, dy));
        setPhoto((p) => ({ ...p, scale, dx, dy, rotate: 0 }));
        track("ai_face");
        flash(f.count > 1 ? `Tìm thấy ${f.count} khuôn mặt — đã căn người lớn nhất ✨` : "AI đã căn khuôn mặt vào khung ✨");
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
    if (mode === "none") {
      setPhoto((p) => ({ ...p, img: original.current, bg: { ...p.bg, mode: "none" } }));
      return;
    }
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
      const c = await fileToCanvas(file);
      original.current = c;
      cutout.current = null;
      setFilterId("none");
      setPhoto({ ...emptyPhoto(), img: c, natW: c.width, natH: c.height, bg: { mode: "none", color: accent, source: null } });
      track("upload");
      setBusy("");
      await autoFace(c, true);
    } catch (e) {
      setBusy("");
      flash((e as Error).message);
    }
  }

  // warm up AI models in idle time once the page is visible
  useEffect(() => {
    if (preview || !allowed.face) return;
    const t = setTimeout(() => import("@/lib/client/ai").then((m) => m.warmup("face")), 1500);
    return () => clearTimeout(t);
  }, [preview, allowed.face]);

  /* ---------- Gestures ---------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; mx: number; my: number } | null>(null);
  const ratio = () => cfg.width / (canvasRef.current?.getBoundingClientRect().width || cfg.width);

  function onPointerDown(e: React.PointerEvent) {
    if (!photo.img) {
      fileRef.current?.click();
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
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
    const r = ratio();
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

  async function makeBlob() {
    // make sure web fonts are ready so exported text never falls back to a system font
    await Promise.all(cfg.texts.map((t) => document.fonts.load(`${t.weight} ${Math.round(t.fontSize)}px ${FONTS[t.font]?.css}`).catch(() => {})));
    const c = document.createElement("canvas");
    c.width = cfg.width;
    c.height = cfg.height;
    render(c.getContext("2d")!, cfg, { frame, photo, values });
    const type = cfg.format === "jpg" ? "image/jpeg" : "image/png";
    return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("export"))), type, 0.93));
  }
  const fileName = () => {
    const n = Object.values(values).filter(Boolean).join("-");
    const base = `${campaign.slug}${n ? "-" + n : ""}`
      .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase();
    return `${base}.${cfg.format === "jpg" ? "jpg" : "png"}`;
  };

  async function download() {
    if (!canExport) {
      flash(needPhoto ? "Hãy chọn ảnh của bạn trước nhé" : `Vui lòng nhập: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setBusy("Đang xuất ảnh chất lượng cao…");
    try {
      const blob = await makeBlob();
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

  const ar = `${cfg.width} / ${cfg.height}`;
  const anyTool = cfg.photo.enabled && !!photo.img;

  return (
    <div className="w-full">
      <div className="relative mx-auto w-full" style={{ maxWidth: `min(100%, calc(62dvh * ${cfg.width / cfg.height}))` }}>
        <div className="checker relative overflow-hidden shadow-[0_30px_60px_-30px_rgb(0_0_0/.45)]" style={{ aspectRatio: ar, borderRadius: "var(--r)" }}>
          <canvas
            ref={canvasRef}
            width={cfg.width}
            height={cfg.height}
            className={cx("absolute inset-0 size-full touch-none", photo.img ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {!frame && !frameErr && <div className="shimmer absolute inset-0" />}
          {frameErr && <div className="absolute inset-0 grid place-items-center bg-white/80 text-sm">Chưa có frame cho chiến dịch này</div>}
          {cfg.photo.enabled && !photo.img && frame && (
            <button onClick={() => fileRef.current?.click()} className="absolute inset-0 grid place-items-center">
              <span className="flex flex-col items-center gap-2 rounded-2xl bg-white/90 px-5 py-4 text-sm font-semibold shadow-lift backdrop-blur" style={{ color: "#17120E" }}>
                <ImagePlus className="size-7" style={{ color: accent }} />
                {campaign.theme.ctaText || "Chọn ảnh của bạn"}
              </span>
            </button>
          )}
          {busy && (
            <div className="absolute inset-x-0 top-3 flex justify-center">
              <span className="flex items-center gap-2 rounded-full bg-black/75 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur"><Loader2 className="size-3.5 animate-spin" />{busy}</span>
            </div>
          )}
          {hint && !busy && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
              <span className="animate-pop rounded-full bg-black/75 px-3.5 py-1.5 text-center text-xs font-medium text-white backdrop-blur">{hint}</span>
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />

      <div className="mx-auto mt-5 w-full max-w-md space-y-3">
        {cfg.texts.length > 0 && (
          <div className="space-y-2.5 rounded-[var(--r)] bg-[var(--surface)] p-3.5 ring-1 ring-[var(--line)]">
            {cfg.texts.map((t) => (
              <label key={t.id} className="block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold opacity-70"><Type className="size-3.5" />{t.label}{t.required && " *"}</span>
                <input
                  value={values[t.id] || ""}
                  maxLength={60}
                  onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value }))}
                  placeholder={t.placeholder}
                  className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 text-[15px] text-stone-900 outline-none focus:ring-4"
                  style={{ ["--tw-ring-color" as string]: accent + "33" }}
                />
              </label>
            ))}
          </div>
        )}

        {cfg.photo.enabled && (
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--surface)] text-sm font-semibold ring-1 ring-[var(--line)] transition active:scale-[.98]">
              <ImagePlus className="size-4" /> {photo.img ? "Đổi ảnh" : "Chọn ảnh"}
            </button>
            <button onClick={() => camRef.current?.click()} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--surface)] text-sm font-semibold ring-1 ring-[var(--line)] transition active:scale-[.98]">
              <Camera className="size-4" /> Chụp selfie
            </button>
          </div>
        )}

        {anyTool && (
          <div className="rounded-[var(--r)] bg-[var(--surface)] p-3 ring-1 ring-[var(--line)] animate-in">
            <div className="mb-3 flex gap-1 rounded-xl bg-black/5 p-1">
              {[
                { id: "adjust" as const, label: "Căn chỉnh", icon: SlidersHorizontal, on: true },
                { id: "bg" as const, label: "Nền AI", icon: Wand2, on: allowed.background },
                { id: "filter" as const, label: "Bộ lọc", icon: Palette, on: allowed.filters },
              ]
                .filter((x) => x.on)
                .map((x) => (
                  <button key={x.id} onClick={() => setTab(x.id)} className={cx("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition", tab === x.id ? "bg-white text-stone-900 shadow-sm" : "opacity-60")}>
                    <x.icon className="size-3.5" />{x.label}
                  </button>
                ))}
            </div>

            {tab === "adjust" && (
              <div className="space-y-3 px-1">
                <label className="flex items-center gap-3 text-xs font-medium"><span className="w-12 opacity-70">Phóng to</span>
                  <input type="range" min={0.4} max={4} step={0.01} value={photo.scale} onChange={(e) => setPhoto((p) => ({ ...p, scale: +e.target.value }))} className="flex-1" style={{ accentColor: accent }} />
                </label>
                <label className="flex items-center gap-3 text-xs font-medium"><span className="w-12 opacity-70">Xoay</span>
                  <input type="range" min={-45} max={45} step={0.5} value={photo.rotate} onChange={(e) => setPhoto((p) => ({ ...p, rotate: +e.target.value }))} className="flex-1" style={{ accentColor: accent }} />
                </label>
                <div className="flex gap-2">
                  {allowed.face && (
                    <button onClick={() => original.current && autoFace(original.current)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-black/5 text-xs font-semibold">
                      <ScanFace className="size-4" style={{ color: accent }} /> AI căn mặt
                    </button>
                  )}
                  <button onClick={() => setPhoto((p) => ({ ...p, scale: 1, dx: 0, dy: 0, rotate: 0 }))} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-black/5 text-xs font-semibold">
                    <RotateCcw className="size-3.5" /> Đặt lại
                  </button>
                </div>
                <p className="text-center text-[11px] opacity-50">Kéo ảnh để di chuyển · Chụm 2 ngón để phóng to</p>
              </div>
            )}

            {tab === "bg" && (
              <div className="space-y-3 px-1">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { m: "none" as const, label: "Ảnh gốc" },
                    { m: "blur" as const, label: "Xoá phông mờ" },
                    { m: "color" as const, label: "Thay nền" },
                  ].map((o) => (
                    <button key={o.m} onClick={() => setBackground(o.m)} className={cx("h-10 rounded-lg text-xs font-semibold transition", photo.bg.mode === o.m ? "text-white" : "bg-black/5")} style={photo.bg.mode === o.m ? { background: accent } : undefined}>
                      {o.label}
                    </button>
                  ))}
                </div>
                {photo.bg.mode === "color" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {[accent, cfg.bgFill, "#FFFFFF", "#111111", "#F5E6D3", "#DCEBFF", "#FDE2E4", "#E3F5E1"].map((c, i) => (
                      <button key={c + i} onClick={() => setBackground("color", c)} className={cx("size-8 rounded-full ring-2 ring-offset-2 transition", photo.bg.color === c ? "ring-stone-900" : "ring-transparent")} style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.1)" }} />
                    ))}
                    <label className="relative size-8 overflow-hidden rounded-full" style={{ background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" }}>
                      <input type="color" className="absolute inset-0 opacity-0" onChange={(e) => setBackground("color", e.target.value)} />
                    </label>
                  </div>
                )}
                <p className="text-center text-[11px] opacity-50">AI chạy ngay trên máy bạn — ảnh không được tải lên máy chủ</p>
              </div>
            )}

            {tab === "filter" && (
              <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {FILTERS.map((f) => (
                  <button key={f.id} onClick={() => { setFilterId(f.id); setPhoto((p) => ({ ...p, filter: f.css })); }} className="shrink-0 text-center">
                    <span className={cx("block size-16 overflow-hidden rounded-xl ring-2 transition", filterId === f.id ? "" : "ring-transparent")} style={filterId === f.id ? { ["--tw-ring-color" as string]: accent } : undefined}>
                      <FilterThumb src={original.current} css={f.css} />
                    </span>
                    <span className="mt-1 block text-[11px] font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={download}
            className={cx("flex h-13 flex-1 items-center justify-center gap-2 rounded-[calc(var(--r)*.7)] py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[.98]", !canExport && "opacity-60")}
            style={{ background: accent, boxShadow: `0 12px 28px -12px ${accent}` }}
          >
            <Download className="size-5" /> {campaign.type === "invitation" ? "Tải thiệp về" : "Tải ảnh về"}
          </button>
          <button onClick={() => (canExport ? share() : download())} className="grid h-auto w-14 place-items-center rounded-[calc(var(--r)*.7)] bg-[var(--surface)] ring-1 ring-[var(--line)] transition active:scale-[.98]" aria-label="Chia sẻ">
            <Share2 className="size-5" />
          </button>
        </div>
      </div>

      {done && <DoneSheet campaign={campaign} done={done} allowCaption={allowed.caption} name={Object.values(values).find(Boolean)} accent={accent} onClose={() => setDone(null)} onShare={() => share(done.blob)} track={track} preview={preview} />}
    </div>
  );
}

function FilterThumb({ src, css }: { src: HTMLCanvasElement | null; css: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !src) return;
    const x = c.getContext("2d")!;
    const s = Math.max(128 / src.width, 128 / src.height);
    x.filter = css;
    x.drawImage(src, (128 - src.width * s) / 2, (128 - src.height * s) / 2, src.width * s, src.height * s);
  }, [src, css]);
  return <canvas ref={ref} width={128} height={128} className="size-full bg-stone-200" />;
}

function DoneSheet({ campaign, done, allowCaption, name, accent, onClose, onShare, track, preview }: {
  campaign: { id: string; title: string; theme: Theme };
  done: { url: string };
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
            <p className="mt-1 text-sm text-stone-500">Không thấy file? Nhấn giữ ảnh bên dưới để lưu vào máy.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5"><X className="size-5" /></button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={done.url} alt="Ảnh của bạn" className="mx-auto mt-4 max-h-[38dvh] rounded-2xl shadow-lg" />
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
              <div key={i} className="group relative rounded-xl bg-stone-50 p-3 pr-11 text-sm whitespace-pre-line">
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

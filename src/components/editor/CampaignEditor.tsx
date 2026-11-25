"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft, BarChart3, Check, Copy, Download, Eye, ImageUp, Laptop, Link2, Loader2, Lock, Plus, Rocket, Smartphone, Trash2, Type, Upload, Wand2, X, Archive,
} from "lucide-react";
import { api, Badge, Button, cx, Field, Input, Segmented, Select, Switch, Textarea, useToast } from "../ui";
import { FramePlacer } from "./FramePlacer";
import { TemplateThumb } from "../TemplateThumb";
import { detectTransparentSlot, loadImage } from "@/lib/client/render";
import { FONTS, TEMPLATE_PRESETS, TEMPLATES, type BgStyle, type CampaignPublic, type FontId, type FrameConfig, type TemplateId, type TextField, type Theme } from "@/lib/types";
import type { Features } from "@/lib/features";

const SAMPLES = [
  { url: "/samples/avatar-ring.svg", label: "Vòng tròn", w: 1080, h: 1080 },
  { url: "/samples/avatar-badge.svg", label: "Băng rôn", w: 1080, h: 1080 },
  { url: "/samples/invitation-classic.svg", label: "Thiệp cổ điển", w: 1080, h: 1350 },
];

const PALETTES = [
  { p: "#FF5A1F", b: "#FFF7F2", t: "#17120E" },
  { p: "#2346FF", b: "#F3F6FF", t: "#0B1233" },
  { p: "#0F9D74", b: "#F0FBF6", t: "#0A2A20" },
  { p: "#B4532A", b: "#FBF7F0", t: "#2A1A10" },
  { p: "#D61F69", b: "#FFF4F8", t: "#2B0A18" },
  { p: "#F5B700", b: "#111111", t: "#FAFAFA" },
];

type Tab = "frame" | "theme" | "share";

const UPLOAD_LIMIT = 3.9 * 1024 * 1024; // serverless body limit (4.5MB) minus multipart overhead

/** Downscale/re-encode large images in the browser. WebP keeps transparency, so frames stay intact. */
async function compress(file: File): Promise<Blob> {
  if (file.size <= UPLOAD_LIMIT) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Ảnh không hợp lệ"));
      i.src = url;
    });
    let max = 2400;
    for (const q of [0.92, 0.85, 0.75, 0.65]) {
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", q));
      if (blob && blob.size <= UPLOAD_LIMIT) return blob;
      max = Math.round(max * 0.85);
    }
    throw new Error("Ảnh quá lớn, vui lòng dùng ảnh dưới 4MB");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadFile(file: File) {
  const fd = new FormData();
  const blob = await compress(file);
  fd.append("file", blob, blob === file ? file.name : file.name.replace(/\.\w+$/, "") + ".webp");
  return api<{ url: string }>("/api/upload", { method: "POST", body: fd });
}

export function CampaignEditor({ initial, perms, appUrl }: { initial: CampaignPublic; perms: Features; appUrl: string }) {
  const router = useRouter();
  const toast = useToast();
  const [c, setC] = useState(initial);
  const [tab, setTab] = useState<Tab>("frame");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [selected, setSelected] = useState<string | null>(null);
  const dirty = useRef(false);
  const iframe = useRef<HTMLIFrameElement>(null);

  // push live state to preview iframe
  const pushPreview = useCallback(() => {
    iframe.current?.contentWindow?.postMessage({ type: "goda:preview", campaign: { theme: c.theme, config: c.config, title: c.title, type: c.type } }, location.origin);
  }, [c]);
  useEffect(() => {
    pushPreview();
  }, [pushPreview]);
  useEffect(() => {
    const on = (e: MessageEvent) => e.origin === location.origin && e.data?.type === "goda:preview-ready" && pushPreview();
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [pushPreview]);

  // debounced autosave
  useEffect(() => {
    if (!dirty.current) return;
    setSaving("saving");
    const t = setTimeout(async () => {
      try {
        await api(`/api/campaigns/${c.id}`, { method: "PATCH", json: { title: c.title, theme: c.theme, config: c.config } });
        setSaving("saved");
      } catch (e) {
        setSaving("error");
        toast((e as Error).message, "bad");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [c.theme, c.config, c.title, c.id, toast]);

  const setTheme = (p: Partial<Theme>) => { dirty.current = true; setC((x) => ({ ...x, theme: { ...x.theme, ...p } })); };
  const setConfig = (p: Partial<FrameConfig>) => { dirty.current = true; setC((x) => ({ ...x, config: { ...x.config, ...p } })); };
  const setTitle = (title: string) => { dirty.current = true; setC((x) => ({ ...x, title })); };

  async function setStatus(status: "draft" | "published" | "archived") {
    try {
      await api(`/api/campaigns/${c.id}`, { method: "PATCH", json: { status } });
      setC((x) => ({ ...x, status }));
      toast(status === "published" ? "🚀 Đã xuất bản! Gửi link cho mọi người thôi" : status === "archived" ? "Đã lưu trữ chiến dịch" : "Đã chuyển về bản nháp");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "bad");
    }
  }

  const publicUrl = `${appUrl}/f/${c.slug}`;

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-10 lg:-mt-10">
      {/* top bar */}
      <div className="sticky top-14 z-20 flex items-center gap-3 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:top-0 lg:px-10">
        <Link href="/dashboard" className="rounded-lg p-2 hover:bg-black/5"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <input value={c.title} onChange={(e) => setTitle(e.target.value)} className="w-full truncate bg-transparent text-lg font-semibold outline-none" />
          <div className="flex items-center gap-2 text-xs text-ink-3">
            {c.status === "published" ? <Badge tone="ok">● Đang chạy</Badge> : c.status === "archived" ? <Badge>Lưu trữ</Badge> : <Badge tone="warn">Bản nháp</Badge>}
            <span className="flex items-center gap-1">
              {saving === "saving" && <><Loader2 className="size-3 animate-spin" /> Đang lưu…</>}
              {saving === "saved" && <><Check className="size-3 text-ok" /> Đã lưu</>}
              {saving === "error" && <span className="text-bad">Lưu thất bại</span>}
            </span>
          </div>
        </div>
        <Link href={`/dashboard/c/${c.id}/stats`} className="hidden h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium shadow-soft sm:inline-flex"><BarChart3 className="size-4" /> Thống kê</Link>
        {c.status === "published" ? (
          <Button variant="secondary" onClick={() => setTab("share")}><Link2 className="size-4" /> <span className="hidden sm:inline">Chia sẻ</span></Button>
        ) : (
          <Button onClick={() => setStatus("published")}><Rocket className="size-4" /> Xuất bản</Button>
        )}
      </div>

      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:px-10 xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="min-w-0">
          <Segmented<Tab> value={tab} onChange={setTab} className="mb-5 w-full sm:w-auto" options={[{ value: "frame", label: "① Frame & bố cục" }, { value: "theme", label: "② Giao diện trang" }, { value: "share", label: "③ Chia sẻ" }]} />
          {tab === "frame" && <FrameTab c={c} setConfig={setConfig} perms={perms} selected={selected} setSelected={setSelected} />}
          {tab === "theme" && <ThemeTab theme={c.theme} setTheme={setTheme} perms={perms} />}
          {tab === "share" && <ShareTab c={c} setC={setC} publicUrl={publicUrl} setStatus={setStatus} />}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold"><Eye className="size-4" /> Xem trước trực tiếp</span>
            <div className="flex items-center gap-2">
              <Segmented value={device} onChange={setDevice} options={[{ value: "mobile", label: <Smartphone className="size-4" /> }, { value: "desktop", label: <Laptop className="size-4" /> }]} />
              <a href={`/f/${c.slug}`} target="_blank" className="rounded-lg p-2 text-ink-3 hover:bg-black/5" title="Mở tab mới"><Link2 className="size-4" /></a>
            </div>
          </div>
          <PreviewFrame id={c.id} device={device} iframeRef={iframe} />
        </div>
      </div>
    </div>
  );
}

function PreviewFrame({ id, device, iframeRef }: { id: string; device: "mobile" | "desktop"; iframeRef: React.RefObject<HTMLIFrameElement | null> }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(400);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const vw = device === "mobile" ? 390 : 1280;
  const vh = device === "mobile" ? 780 : 820;
  const scale = Math.min(1, w / (vw + (device === "mobile" ? 24 : 0)));
  return (
    <div ref={box} className="w-full">
      <div className="mx-auto overflow-hidden" style={{ width: (vw + (device === "mobile" ? 24 : 0)) * scale, height: (vh + (device === "mobile" ? 24 : 0)) * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: vw + (device === "mobile" ? 24 : 0) }}>
          <div className={cx("bg-ink shadow-lift", device === "mobile" ? "rounded-[44px] p-3" : "rounded-xl p-0")}>
            <iframe ref={iframeRef} src={`/preview/${id}`} title="Xem trước" className={cx("block bg-white", device === "mobile" ? "rounded-[34px]" : "rounded-xl")} style={{ width: vw, height: vh }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Frame tab ---------------- */
function FrameTab({ c, setConfig, perms, selected, setSelected }: { c: CampaignPublic; setConfig: (p: Partial<FrameConfig>) => void; perms: Features; selected: string | null; setSelected: (s: string | null) => void }) {
  const cfg = c.config;
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function applyFrame(url: string, auto = true) {
    try {
      const img = await loadImage(url);
      let W = img.naturalWidth || 1080, H = img.naturalHeight || 1080;
      const k = Math.min(1, 3000 / Math.max(W, H));
      W = Math.round(W * k); H = Math.round(H * k);
      const next: Partial<FrameConfig> = { frameUrl: url, width: W, height: H };
      if (auto) {
        const slot = detectTransparentSlot(img, W, H);
        if (slot) {
          next.photo = { ...cfg.photo, enabled: true, layer: "below", ...slot };
          toast("✨ Đã tự nhận diện vùng đặt ảnh trong suốt");
        } else if (c.type === "avatar") {
          next.photo = { ...cfg.photo, x: Math.round(W * 0.2), y: Math.round(H * 0.2), w: Math.round(W * 0.6), h: Math.round(H * 0.6), layer: "above" };
          toast("Frame không có vùng trong suốt — hãy kéo khung ảnh vào vị trí mong muốn");
        }
        // keep text fields inside new bounds
        next.texts = cfg.texts.map((t) => ({ ...t, x: Math.min(t.x, W - 20), y: Math.min(t.y, H - 20), maxWidth: Math.min(t.maxWidth, W) }));
      }
      setConfig(next);
    } catch {
      toast("Không tải được frame", "bad");
    }
  }

  async function onUpload(f?: File) {
    if (!f) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(f);
      await applyFrame(url);
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setUploading(false);
    }
  }

  function addText() {
    if (cfg.texts.length >= 6) return;
    const id = "t" + Date.now().toString(36);
    const t: TextField = {
      id, label: cfg.texts.length ? "Chức danh / Đơn vị" : "Tên của bạn", placeholder: cfg.texts.length ? "VD: Phòng Marketing" : "VD: Nguyễn Văn An", defaultValue: "",
      x: Math.round(cfg.width / 2), y: Math.round(cfg.height * (0.6 + cfg.texts.length * 0.08)), maxWidth: Math.round(cfg.width * 0.8),
      fontSize: Math.round(cfg.width * (cfg.texts.length ? 0.035 : 0.06)), font: "be-vietnam", color: "#17120E", weight: 700, align: "center", uppercase: false, required: cfg.texts.length === 0,
    };
    setConfig({ texts: [...cfg.texts, t] });
    setSelected(id);
  }
  const updText = (id: string, p: Partial<TextField>) => setConfig({ texts: cfg.texts.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  const sel = cfg.texts.find((t) => t.id === selected);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">File frame</h3>
            <p className="text-sm text-ink-3">PNG nền trong suốt (khuyến nghị 1080×1080 cho avatar, 1080×1350 cho thiệp). Tối đa 10MB.</p>
          </div>
          <Button onClick={() => fileRef.current?.click()} loading={uploading}><Upload className="size-4" /> Tải frame lên</Button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none">
          {SAMPLES.map((s) => (
            <button key={s.url} onClick={() => applyFrame(s.url)} className={cx("shrink-0 rounded-xl border-2 p-1 text-center", cfg.frameUrl === s.url ? "border-brand" : "border-line")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="" className="checker h-16 w-16 rounded-lg object-contain" />
              <span className="mt-1 block text-[11px] font-medium text-ink-2">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Bố cục</h3>
          <span className="text-xs text-ink-3">{cfg.width}×{cfg.height}px · Kéo thả để đặt vị trí</span>
        </div>
        <div className="mx-auto max-w-[520px]">
          <FramePlacer cfg={cfg} onChange={(n) => setConfig(n)} selected={selected} onSelect={setSelected} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setSelected("photo")} className={cx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", selected === "photo" ? "bg-brand text-white" : "bg-stone-100")}><ImageUp className="size-3.5" />Vùng ảnh</button>
          {cfg.texts.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)} className={cx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", selected === t.id ? "bg-blue-600 text-white" : "bg-stone-100")}><Type className="size-3.5" />{t.label}</button>
          ))}
          <button onClick={addText} disabled={cfg.texts.length >= 6} className="flex items-center gap-1.5 rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-xs font-semibold text-ink-2 disabled:opacity-40"><Plus className="size-3.5" />Thêm trường chữ</button>
        </div>

        {(selected === "photo" || !selected) && (
          <div className="mt-5 space-y-4 border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-semibold">Cho khách tải ảnh</div><div className="text-xs text-ink-3">Tắt nếu thiệp chỉ cần nhập tên</div></div>
              <Switch checked={cfg.photo.enabled} onChange={(v) => setConfig({ photo: { ...cfg.photo, enabled: v } })} />
            </div>
            {cfg.photo.enabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Hình dạng vùng ảnh">
                  <Segmented className="w-full" value={cfg.photo.shape} onChange={(v) => setConfig({ photo: { ...cfg.photo, shape: v } })} options={[{ value: "rect", label: "Vuông" }, { value: "rounded", label: "Bo góc" }, { value: "circle", label: "Tròn" }]} />
                </Field>
                <Field label="Lớp ảnh" hint="'Dưới frame' cho PNG trong suốt">
                  <Segmented className="w-full" value={cfg.photo.layer} onChange={(v) => setConfig({ photo: { ...cfg.photo, layer: v } })} options={[{ value: "below", label: "Dưới frame" }, { value: "above", label: "Trên frame" }]} />
                </Field>
                <div className="grid grid-cols-4 gap-2 sm:col-span-2">
                  {(["x", "y", "w", "h"] as const).map((k) => (
                    <Field key={k} label={k.toUpperCase()}>
                      <Input type="number" value={Math.round(cfg.photo[k])} onChange={(e) => setConfig({ photo: { ...cfg.photo, [k]: Math.max(k === "w" || k === "h" ? 20 : -5000, +e.target.value || 0) } })} className="h-9 text-sm" />
                    </Field>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {sel && (
          <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <Field label="Nhãn hiển thị cho khách"><Input value={sel.label} onChange={(e) => updText(sel.id, { label: e.target.value })} /></Field>
            <Field label="Gợi ý (placeholder)"><Input value={sel.placeholder} onChange={(e) => updText(sel.id, { placeholder: e.target.value })} /></Field>
            <Field label="Font chữ">
              <Select value={sel.font} onChange={(e) => updText(sel.id, { font: e.target.value as FontId })}>
                {(Object.keys(FONTS) as FontId[]).map((f) => <option key={f} value={f}>{FONTS[f].label}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label={`Cỡ chữ: ${Math.round(sel.fontSize)}px`}>
                <input type="range" min={12} max={Math.round(cfg.width * 0.15)} value={sel.fontSize} onChange={(e) => updText(sel.id, { fontSize: +e.target.value })} className="mt-3 w-full" />
              </Field>
              <Field label="Màu"><input type="color" value={sel.color} onChange={(e) => updText(sel.id, { color: e.target.value })} className="h-10 w-12" /></Field>
            </div>
            <Field label="Căn lề">
              <Segmented className="w-full" value={sel.align} onChange={(v) => updText(sel.id, { align: v })} options={[{ value: "left", label: "Trái" }, { value: "center", label: "Giữa" }, { value: "right", label: "Phải" }]} />
            </Field>
            <Field label="Độ đậm">
              <Segmented className="w-full" value={String(sel.weight)} onChange={(v) => updText(sel.id, { weight: +v })} options={[{ value: "400", label: "Thường" }, { value: "600", label: "Vừa" }, { value: "700", label: "Đậm" }, { value: "800", label: "Rất đậm" }]} />
            </Field>
            <Field label={`Chiều rộng tối đa: ${Math.round(sel.maxWidth)}px`} hint="Chữ dài sẽ tự thu nhỏ để vừa khung">
              <input type="range" min={100} max={cfg.width} value={sel.maxWidth} onChange={(e) => updText(sel.id, { maxWidth: +e.target.value })} className="mt-3 w-full" />
            </Field>
            <Field label="Giá trị mặc định" hint="Để trống nếu khách tự nhập"><Input value={sel.defaultValue} onChange={(e) => updText(sel.id, { defaultValue: e.target.value })} /></Field>
            <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm"><Switch checked={sel.uppercase} onChange={(v) => updText(sel.id, { uppercase: v })} /> In hoa</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={sel.required} onChange={(v) => updText(sel.id, { required: v })} /> Bắt buộc</label>
              <Button variant="danger" size="sm" className="ml-auto" onClick={() => { setConfig({ texts: cfg.texts.filter((t) => t.id !== sel.id) }); setSelected(null); }}><Trash2 className="size-3.5" /> Xoá trường</Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h3 className="flex items-center gap-2 font-semibold"><Wand2 className="size-4 text-brand" /> Tính năng AI cho khách</h3>
        <p className="text-sm text-ink-3">Chạy trên thiết bị của khách bằng mô hình mã nguồn mở (MediaPipe). Ảnh không được tải lên máy chủ.</p>
        <div className="mt-4 divide-y divide-line">
          {[
            { k: "face" as const, t: "Tự căn khuôn mặt", d: "Nhận diện mặt và căn vào giữa khung ảnh", perm: perms.aiFace },
            { k: "background" as const, t: "Tách / thay nền", d: "Xoá phông, thay nền màu, làm mờ hậu cảnh", perm: perms.aiBackground },
            { k: "filters" as const, t: "Bộ lọc màu", d: "7 preset: Tươi sáng, Ấm áp, Film, Đen trắng…", perm: true },
            { k: "caption" as const, t: "AI viết caption", d: "Gợi ý caption đăng social kèm hashtag", perm: perms.aiCaption },
          ].map((o) => (
            <div key={o.k} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">{o.t}{!o.perm && <Badge tone="warn"><Lock className="size-3" /> Gói cao hơn</Badge>}</div>
                <div className="text-xs text-ink-3">{o.d}</div>
              </div>
              <Switch checked={cfg.ai[o.k] && o.perm} disabled={!o.perm} onChange={(v) => setConfig({ ai: { ...cfg.ai, [o.k]: v } })} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft sm:grid-cols-3">
        <Field label="Màu nền canvas" hint="Hiện ở vùng trong suốt">
          <div className="flex items-center gap-2"><input type="color" value={cfg.bgFill} onChange={(e) => setConfig({ bgFill: e.target.value })} className="h-10 w-12" /><span className="font-mono text-xs text-ink-3">{cfg.bgFill}</span></div>
        </Field>
        <Field label="Định dạng tải về">
          <Segmented className="w-full" value={cfg.format} onChange={(v) => setConfig({ format: v })} options={[{ value: "png", label: "PNG" }, { value: "jpg", label: "JPG (nhẹ)" }]} />
        </Field>
        <Field label="Ghi nhận tên khách" hint="Lưu tên đã nhập vào thống kê">
          <Switch checked={cfg.collectNames} onChange={(v) => setConfig({ collectNames: v })} />
        </Field>
      </section>
    </div>
  );
}

/* ---------------- Theme tab ---------------- */
function ImagePick({ label, value, onChange, hint }: { label: string; value: string; onChange: (u: string) => void; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div className="checker grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className="size-full object-contain" /> : <ImageUp className="size-5 text-ink-3" />}
        </div>
        <Button variant="secondary" size="sm" loading={loading} onClick={() => ref.current?.click()}>Tải lên</Button>
        {value && <Button variant="ghost" size="sm" onClick={() => onChange("")}><X className="size-3.5" /> Xoá</Button>}
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setLoading(true);
          try { onChange((await uploadFile(f)).url); } catch (err) { toast((err as Error).message, "bad"); } finally { setLoading(false); }
        }} />
      </div>
    </Field>
  );
}

function ThemeTab({ theme, setTheme, perms }: { theme: Theme; setTheme: (p: Partial<Theme>) => void; perms: Features }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h3 className="font-semibold">Giao diện mẫu</h3>
        <p className="text-sm text-ink-3">Chọn mẫu sẽ áp bảng màu gợi ý — bạn vẫn tuỳ biến lại được bên dưới.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => {
            const locked = TEMPLATES[id].premium && !perms.premiumTemplates;
            return (
              <button key={id} disabled={locked} onClick={() => setTheme({ template: id, ...TEMPLATE_PRESETS[id] })} className={cx("rounded-2xl border-2 p-1.5 text-left disabled:opacity-50", theme.template === id ? "border-brand" : "border-transparent hover:border-line")}>
                <TemplateThumb id={id} />
                <div className="flex items-center justify-between px-1 pt-2 text-sm font-semibold">{TEMPLATES[id].name}{locked && <Lock className="size-3.5 text-ink-3" />}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h3 className="font-semibold">Thương hiệu</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {PALETTES.map((p) => (
            <button key={p.p + p.b} onClick={() => setTheme({ primary: p.p, background: p.b, text: p.t })} className="flex overflow-hidden rounded-full ring-1 ring-line transition hover:scale-105" title="Áp dụng bảng màu">
              <span className="size-7" style={{ background: p.p }} /><span className="size-7" style={{ background: p.b }} />
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([["primary", "Màu chủ đạo"], ["secondary", "Màu phụ"], ["background", "Màu nền"], ["text", "Màu chữ"]] as const).map(([k, l]) => (
            <Field key={k} label={l}>
              <div className="flex items-center gap-2 rounded-xl border border-line p-1.5"><input type="color" value={theme[k]} onChange={(e) => setTheme({ [k]: e.target.value })} className="h-8 w-10" /><span className="font-mono text-xs text-ink-3">{theme[k]}</span></div>
            </Field>
          ))}
        </div>
        <Field label="Kiểu nền trang" className="mt-4">
          <Segmented<BgStyle> className="w-full" value={theme.bgStyle} onChange={(v) => setTheme({ bgStyle: v })} options={[{ value: "solid", label: "Màu trơn" }, { value: "gradient", label: "Gradient" }, { value: "mesh", label: "Mesh" }, { value: "image", label: "Ảnh nền" }]} />
        </Field>
        {theme.bgStyle === "image" && !theme.coverUrl && <p className="mt-2 text-xs text-amber-700">Tải “Ảnh bìa” bên dưới để dùng làm ảnh nền.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Font chữ trang">
            <Select value={theme.font} onChange={(e) => setTheme({ font: e.target.value as FontId })}>
              {(Object.keys(FONTS) as FontId[]).map((f) => <option key={f} value={f}>{FONTS[f].label}</option>)}
            </Select>
          </Field>
          <Field label={`Bo góc: ${theme.radius}px`}>
            <input type="range" min={0} max={36} value={theme.radius} onChange={(e) => setTheme({ radius: +e.target.value })} className="mt-3 w-full" />
          </Field>
          <ImagePick label="Logo" value={theme.logoUrl} onChange={(u) => setTheme({ logoUrl: u })} hint="PNG nền trong suốt" />
          <ImagePick label="Ảnh bìa / ảnh nền" value={theme.coverUrl} onChange={(u) => setTheme({ coverUrl: u })} hint="Dải bìa của mẫu Bold, kiểu nền “Ảnh nền” & ảnh khi chia sẻ link" />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h3 className="font-semibold">Nội dung</h3>
        <Field label="Tiêu đề lớn"><Input value={theme.headline} onChange={(e) => setTheme({ headline: e.target.value })} maxLength={140} /></Field>
        <Field label="Mô tả ngắn"><Textarea rows={2} value={theme.subheadline} onChange={(e) => setTheme({ subheadline: e.target.value })} maxLength={400} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nút kêu gọi"><Input value={theme.ctaText} onChange={(e) => setTheme({ ctaText: e.target.value })} maxLength={40} /></Field>
          <Field label="Hashtag chiến dịch"><Input value={theme.hashtag} onChange={(e) => setTheme({ hashtag: e.target.value })} placeholder="#GODA2026 #ProudToBe" maxLength={120} /></Field>
        </div>
        <Field label="Caption mẫu gợi ý cho khách" hint="Hiện sau khi khách tải ảnh, có nút sao chép. AI caption sẽ dựa trên thông điệp này."><Textarea rows={3} value={theme.caption} onChange={(e) => setTheme({ caption: e.target.value })} maxLength={600} /></Field>
        <Field label="Footer"><Textarea rows={2} value={theme.footerText} onChange={(e) => setTheme({ footerText: e.target.value })} maxLength={300} /></Field>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Liên kết</h3>
          <Button variant="secondary" size="sm" disabled={theme.links.length >= 8} onClick={() => setTheme({ links: [...theme.links, { label: "Website", url: "https://" }] })}><Plus className="size-3.5" /> Thêm</Button>
        </div>
        <div className="mt-3 space-y-2">
          {theme.links.length === 0 && <p className="text-sm text-ink-3">Thêm link website, fanpage, đăng ký sự kiện, chỉ đường…</p>}
          {theme.links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input className="h-10 w-36 text-sm" value={l.label} onChange={(e) => setTheme({ links: theme.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <Input className="h-10 text-sm" value={l.url} onChange={(e) => setTheme({ links: theme.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <Button variant="ghost" size="sm" className="h-10" onClick={() => setTheme({ links: theme.links.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div>
          <div className="flex items-center gap-2 font-semibold">Hiển thị “Powered by GODA.Frame” {!perms.removeBranding && <Badge tone="warn"><Lock className="size-3" /> Business</Badge>}</div>
          <div className="text-sm text-ink-3">Gói Business có thể ẩn để white-label hoàn toàn</div>
        </div>
        <Switch checked={theme.showPoweredBy || !perms.removeBranding} disabled={!perms.removeBranding} onChange={(v) => setTheme({ showPoweredBy: v })} />
      </section>
    </div>
  );
}

/* ---------------- Share tab ---------------- */
function ShareTab({ c, setC, publicUrl, setStatus }: { c: CampaignPublic; setC: React.Dispatch<React.SetStateAction<CampaignPublic>>; publicUrl: string; setStatus: (s: "draft" | "published" | "archived") => void }) {
  const toast = useToast();
  const router = useRouter();
  const [qr, setQr] = useState("");
  const [slug, setSlug] = useState(c.slug);
  const [savingSlug, setSavingSlug] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(publicUrl + "?src=qr", { width: 720, margin: 2, color: { dark: "#0c0a09", light: "#ffffff" } }).then(setQr);
  }, [publicUrl]);

  const copy = async (t: string) => { await navigator.clipboard.writeText(t); toast("Đã sao chép"); };

  async function saveSlug() {
    setSavingSlug(true);
    try {
      const r = await api<{ slug: string }>(`/api/campaigns/${c.id}`, { method: "PATCH", json: { slug } });
      setC((x) => ({ ...x, slug: r.slug }));
      setSlug(r.slug);
      toast("Đã cập nhật link");
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setSavingSlug(false);
    }
  }

  async function remove() {
    if (!confirm(`Xoá vĩnh viễn "${c.title}" và toàn bộ thống kê? Không thể hoàn tác.`)) return;
    await api(`/api/campaigns/${c.id}`, { method: "DELETE" });
    toast("Đã xoá chiến dịch");
    router.push("/dashboard");
    router.refresh();
  }

  const channels = [
    { k: "facebook", label: "Facebook" }, { k: "zalo", label: "Zalo" }, { k: "email", label: "Email" }, { k: "workplace", label: "Workplace" },
  ];

  return (
    <div className="space-y-5">
      <section className={cx("rounded-2xl border p-5 shadow-soft", c.status === "published" ? "border-green-200 bg-green-50/50" : "border-line bg-white")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{c.status === "published" ? "Trang đang mở cho mọi người 🎉" : "Trang chưa xuất bản"}</h3>
            <p className="text-sm text-ink-3">{c.status === "published" ? "Mọi thay đổi được cập nhật ngay cho khách." : "Chỉ bạn xem được bản xem trước."}</p>
          </div>
          {c.status === "published" ? (
            <Button variant="secondary" onClick={() => setStatus("draft")}>Tạm dừng</Button>
          ) : (
            <Button onClick={() => setStatus("published")}><Rocket className="size-4" /> Xuất bản ngay</Button>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl border border-line bg-white px-3.5 font-mono text-sm"><span className="truncate">{publicUrl}</span></div>
          <Button variant="dark" className="h-11" onClick={() => copy(publicUrl)}><Copy className="size-4" /> Sao chép</Button>
        </div>
      </section>

      <section className="grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-soft sm:grid-cols-[180px_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="QR code" className="w-full rounded-xl border border-line" /> : <div className="shimmer aspect-square rounded-xl bg-stone-100" />}
          <a href={qr} download={`qr-${c.slug}.png`} className="mt-2 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line text-xs font-semibold"><Download className="size-3.5" /> Tải QR</a>
        </div>
        <div>
          <h3 className="font-semibold">QR code & link theo kênh</h3>
          <p className="text-sm text-ink-3">In QR lên standee, backdrop sự kiện. Dùng link theo kênh để biết khách đến từ đâu.</p>
          <div className="mt-4 space-y-2">
            {channels.map((ch) => (
              <div key={ch.k} className="flex items-center gap-2">
                <span className="w-24 text-sm text-ink-2">{ch.label}</span>
                <code className="min-w-0 flex-1 truncate rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs">{publicUrl}?src={ch.k}</code>
                <button onClick={() => copy(`${publicUrl}?src=${ch.k}`)} className="rounded-lg p-1.5 hover:bg-black/5"><Copy className="size-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/integrations" className="rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:border-brand/40">
          <div className="font-semibold">Nhúng vào website →</div>
          <p className="mt-1 text-sm text-ink-3">Mã nút/popup hoặc khung nhúng cho landing page, WordPress, Ladipage…</p>
        </Link>
        <Link href="/dashboard/domains" className="rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:border-brand/40">
          <div className="font-semibold">Tên miền riêng →</div>
          <p className="mt-1 text-sm text-ink-3">Chạy trang này trên frame.congty.vn thay cho link GODA.</p>
        </Link>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h3 className="font-semibold">Tuỳ chỉnh đường link</h3>
        <div className="mt-3 flex gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl border border-line bg-white pl-3.5 text-sm focus-within:border-brand">
            <span className="shrink-0 text-ink-3">/f/</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="h-full min-w-0 flex-1 bg-transparent px-1 outline-none" />
          </div>
          <Button variant="secondary" className="h-11" disabled={slug === c.slug || slug.length < 3} loading={savingSlug} onClick={saveSlug}>Lưu</Button>
        </div>
        <p className="mt-2 text-xs text-amber-700">Lưu ý: đổi link sau khi đã gửi sẽ khiến link cũ không truy cập được.</p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-white p-5 shadow-soft">
        <div>
          <h3 className="font-semibold">Vùng nguy hiểm</h3>
          <p className="text-sm text-ink-3">Lưu trữ để đóng trang nhưng giữ thống kê. Xoá sẽ mất toàn bộ dữ liệu.</p>
        </div>
        <div className="flex gap-2">
          {c.status !== "archived" && <Button variant="secondary" onClick={() => setStatus("archived")}><Archive className="size-4" /> Lưu trữ</Button>}
          <Button variant="danger" onClick={remove}><Trash2 className="size-4" /> Xoá</Button>
        </div>
      </section>
    </div>
  );
}

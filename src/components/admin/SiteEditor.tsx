"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, Copy, Eye, EyeOff, GripVertical, ImageUp, Laptop, Loader2, Plus, RotateCcw, Save, Smartphone, Trash2, X,
} from "lucide-react";
import { api, Button, cx, Field, Input, Segmented, Select, Textarea, useToast } from "../ui";
import { DEFAULT_SITE, FEATURE_ICONS, newSection, SECTION_LABEL, type HomeSection, type SectionType, type SiteSettings } from "@/lib/siteTypes";
import { ICONS } from "../home/HomeView";

type Tab = "brand" | "home" | "seo";

async function upload(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return (await api<{ url: string }>("/api/upload", { method: "POST", body: fd })).url;
}

function ImageField({ label, value, onChange, hint, wide }: { label: string; value: string; onChange: (u: string) => void; hint?: string; wide?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div className={cx("checker grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line", wide ? "h-14 w-[106px]" : "size-14")}>
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
          try { onChange(await upload(f)); } catch (err) { toast((err as Error).message, "bad"); } finally { setLoading(false); }
        }} />
      </div>
    </Field>
  );
}

/** Generic drag-to-reorder for a list (HTML5 DnD + keyboard-free up/down fallback). */
function useReorder<T>(list: T[], set: (l: T[]) => void) {
  const from = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const handlers = (i: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { from.current = i; e.dataTransfer.effectAllowed = "move"; },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(i); },
    onDragLeave: () => setOver((o) => (o === i ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const f = from.current;
      setOver(null);
      from.current = null;
      if (f === null || f === i) return;
      const next = [...list];
      const [m] = next.splice(f, 1);
      next.splice(i, 0, m);
      set(next);
    },
    onDragEnd: () => { from.current = null; setOver(null); },
  });
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  return { handlers, over, move };
}

export function SiteEditor({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [site, setSite] = useState<SiteSettings>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [tab, setTab] = useState<Tab>("home");
  const [open, setOpen] = useState<string | null>(initial.home.sections[0]?.id ?? null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const dirty = JSON.stringify(site) !== saved;

  const push = useCallback(() => {
    iframe.current?.contentWindow?.postMessage({ type: "goda:site-draft", site, selected: tab === "brand" ? "__brand" : open, scrollTo }, location.origin);
  }, [site, open, tab, scrollTo]);
  useEffect(() => { push(); }, [push]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      if (e.data?.type === "goda:site-ready") push();
      if (e.data?.type === "goda:site-select") {
        const id = e.data.id as string;
        if (id === "__brand") setTab("brand");
        else if (id === "__footer") { setTab("home"); setOpen("__footer"); }
        else { setTab("home"); setOpen(id); }
        setTimeout(() => document.getElementById("card-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [push]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setBrand = (p: Partial<SiteSettings["brand"]>) => setSite((s) => ({ ...s, brand: { ...s.brand, ...p } }));
  const setSeo = (p: Partial<SiteSettings["seo"]>) => setSite((s) => ({ ...s, seo: { ...s.seo, ...p } }));
  const sections = site.home.sections;
  const setSections = (l: HomeSection[]) => setSite((s) => ({ ...s, home: { sections: l } }));
  const updSection = (id: string, p: Partial<HomeSection>) => {
    setSections(sections.map((x) => (x.id === id ? ({ ...x, ...p } as HomeSection) : x)));
    setScrollTo(id);
  };
  const reorder = useReorder(sections, setSections);

  async function save() {
    setSaving(true);
    try {
      await api("/api/admin/site", { method: "PUT", json: site });
      setSaved(JSON.stringify(site));
      toast("Đã lưu — giao diện mới áp dụng ngay cho toàn hệ thống");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-10 lg:-mt-10">
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:top-0 lg:px-10">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">Giao diện hệ thống</h1>
          <p className="text-xs text-ink-3">{dirty ? "Có thay đổi chưa lưu" : "Đã lưu"} · Bấm vào bất kỳ phần nào trên bản xem trước để sửa</p>
        </div>
        <Button variant="ghost" onClick={() => { if (confirm("Khôi phục toàn bộ giao diện về mặc định? (chưa lưu cho tới khi bấm Lưu)")) setSite(DEFAULT_SITE); }}><RotateCcw className="size-4" /> Mặc định</Button>
        <Button onClick={save} loading={saving} disabled={!dirty}><Save className="size-4" /> Lưu & áp dụng</Button>
      </div>

      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:px-10">
        <div className="min-w-0 space-y-4">
          <Segmented<Tab> value={tab} onChange={setTab} className="w-full" options={[{ value: "brand", label: "Thương hiệu" }, { value: "home", label: "Trang chủ" }, { value: "seo", label: "SEO & chia sẻ" }]} />

          {tab === "brand" && (
            <section className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft" id="card-__brand">
              <Field label="Tên thương hiệu" hint="Dấu “.” trong tên sẽ được tô màu chủ đạo, VD: GODA.Frame"><Input value={site.brand.name} onChange={(e) => setBrand({ name: e.target.value })} maxLength={40} /></Field>
              <ImageField label="Logo" value={site.brand.logoUrl} onChange={(u) => setBrand({ logoUrl: u })} hint="PNG nền trong suốt, cao ~64px. Khi có logo, tên chữ sẽ được ẩn." wide />
              <ImageField label="Icon / favicon" value={site.brand.iconUrl} onChange={(u) => setBrand({ iconUrl: u })} hint="Ảnh vuông 512×512 — hiện trên tab trình duyệt và màn hình chính" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Màu chủ đạo" hint="Nút, điểm nhấn toàn hệ thống">
                  <div className="flex items-center gap-2 rounded-xl border border-line p-1.5"><input type="color" value={site.brand.primary} onChange={(e) => setBrand({ primary: e.target.value })} className="h-8 w-10" /><span className="font-mono text-xs text-ink-3">{site.brand.primary}</span></div>
                </Field>
                <Field label="Màu chữ đậm / nền tối">
                  <div className="flex items-center gap-2 rounded-xl border border-line p-1.5"><input type="color" value={site.brand.ink} onChange={(e) => setBrand({ ink: e.target.value })} className="h-8 w-10" /><span className="font-mono text-xs text-ink-3">{site.brand.ink}</span></div>
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                {[["#FF5A1F", "#0C0A09"], ["#F37021", "#0A2463"], ["#2346FF", "#0B1233"], ["#0F9D74", "#0A2A20"], ["#D61F69", "#2B0A18"], ["#7C3AED", "#1E1B4B"]].map(([p, k]) => (
                  <button key={p} onClick={() => setBrand({ primary: p, ink: k })} className="flex overflow-hidden rounded-full ring-1 ring-line transition hover:scale-105"><span className="size-7" style={{ background: p }} /><span className="size-7" style={{ background: k }} /></button>
                ))}
              </div>
            </section>
          )}

          {tab === "seo" && (
            <section className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
              <Field label="Tiêu đề trang (thẻ title)"><Input value={site.seo.title} onChange={(e) => setSeo({ title: e.target.value })} maxLength={120} /></Field>
              <Field label="Mô tả (meta description)"><Textarea rows={3} value={site.seo.description} onChange={(e) => setSeo({ description: e.target.value })} maxLength={300} /></Field>
              <ImageField label="Ảnh thumbnail mặc định khi chia sẻ link" value={site.seo.ogImage} onChange={(u) => setSeo({ ogImage: u })} hint="Tỉ lệ 1200×630. Để trống: hệ thống tự tạo ảnh từ tên & màu thương hiệu." wide />
              <div>
                <div className="mb-1.5 text-[13px] font-medium text-ink-2">Xem trước khi chia sẻ (Facebook / Zalo)</div>
                <div className="overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={site.seo.ogImage || `/api/og/site?v=${encodeURIComponent(saved.length + site.brand.primary)}`} alt="" className="aspect-[1200/630] w-full bg-stone-100 object-cover" />
                  <div className="bg-stone-50 p-3">
                    <div className="text-[11px] uppercase text-ink-3">{typeof location !== "undefined" ? location.host : ""}</div>
                    <div className="line-clamp-1 font-semibold">{site.seo.title}</div>
                    <div className="line-clamp-2 text-sm text-ink-3">{site.seo.description}</div>
                  </div>
                </div>
                {!site.seo.ogImage && <p className="mt-1.5 text-xs text-ink-3">Ảnh tự tạo cập nhật theo tên & màu sau khi bấm Lưu.</p>}
              </div>
            </section>
          )}

          {tab === "home" && (
            <>
              <div className="space-y-2">
                {sections.map((s, i) => (
                  <div
                    key={s.id}
                    id={"card-" + s.id}
                    {...reorder.handlers(i)}
                    className={cx("rounded-2xl border bg-white shadow-soft transition", reorder.over === i ? "border-brand ring-2 ring-brand/30" : "border-line", open === s.id && "ring-2 ring-brand/40", !s.visible && "opacity-60")}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <GripVertical className="size-4 shrink-0 cursor-grab text-ink-3 active:cursor-grabbing" />
                      <button onClick={() => { setOpen(open === s.id ? null : s.id); setScrollTo(s.id); }} className="min-w-0 flex-1 text-left">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{SECTION_LABEL[s.type]}</div>
                        <div className="truncate text-sm font-medium">{"title" in s && s.title ? s.title : "—"}</div>
                      </button>
                      <div className="flex shrink-0 items-center">
                        <button title="Lên" onClick={() => reorder.move(i, -1)} className="rounded-lg p-1.5 text-ink-3 hover:bg-black/5 disabled:opacity-30" disabled={i === 0}>↑</button>
                        <button title="Xuống" onClick={() => reorder.move(i, 1)} className="rounded-lg p-1.5 text-ink-3 hover:bg-black/5 disabled:opacity-30" disabled={i === sections.length - 1}>↓</button>
                        <button title={s.visible ? "Ẩn" : "Hiện"} onClick={() => updSection(s.id, { visible: !s.visible })} className="rounded-lg p-1.5 text-ink-3 hover:bg-black/5">{s.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
                        <button title="Nhân bản" onClick={() => { const c = { ...structuredClone(s), id: s.type + "-" + Math.random().toString(36).slice(2, 7) }; const n = [...sections]; n.splice(i + 1, 0, c); setSections(n); }} className="rounded-lg p-1.5 text-ink-3 hover:bg-black/5"><Copy className="size-4" /></button>
                        <button title="Xoá" onClick={() => confirm("Xoá khối này?") && setSections(sections.filter((x) => x.id !== s.id))} className="rounded-lg p-1.5 text-ink-3 hover:bg-red-50 hover:text-bad"><Trash2 className="size-4" /></button>
                        <ChevronDown className={cx("size-4 text-ink-3 transition", open === s.id && "rotate-180")} />
                      </div>
                    </div>
                    {open === s.id && <div className="space-y-3 border-t border-line p-4"><SectionForm s={s} upd={(p) => updSection(s.id, p)} /></div>}
                  </div>
                ))}
              </div>
              <AddSection onAdd={(t) => { const n = newSection(t); setSections([...sections, n]); setOpen(n.id); setScrollTo(n.id); }} />
              <section id="card-__footer" className={cx("rounded-2xl border border-line bg-white p-4 shadow-soft", open === "__footer" && "ring-2 ring-brand/40")}>
                <Field label="Footer" hint="{year} sẽ tự thay bằng năm hiện tại"><Input value={site.footer} onChange={(e) => setSite((x) => ({ ...x, footer: e.target.value }))} maxLength={300} /></Field>
              </section>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold"><Eye className="size-4" /> Xem trước trực tiếp</span>
            <Segmented value={device} onChange={setDevice} options={[{ value: "desktop", label: <Laptop className="size-4" /> }, { value: "mobile", label: <Smartphone className="size-4" /> }]} />
          </div>
          <Preview iframeRef={iframe} device={device} />
        </div>
      </div>
    </div>
  );
}

function Preview({ iframeRef, device }: { iframeRef: React.RefObject<HTMLIFrameElement | null>; device: "desktop" | "mobile" }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const vw = device === "mobile" ? 390 : 1280;
  const vh = device === "mobile" ? 800 : 900;
  const scale = Math.min(1, w / vw);
  return (
    <div ref={box} className="relative w-full">
      {loading && <div className="absolute inset-0 z-10 grid place-items-center"><Loader2 className="size-6 animate-spin text-ink-3" /></div>}
      <div className="mx-auto overflow-hidden rounded-2xl border border-line bg-white shadow-lift" style={{ width: vw * scale, height: vh * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: vw }}>
          <iframe ref={iframeRef} src="/site-preview" title="Xem trước trang chủ" onLoad={() => setLoading(false)} style={{ width: vw, height: vh, border: 0, display: "block" }} />
        </div>
      </div>
    </div>
  );
}

function AddSection({ onAdd }: { onAdd: (t: SectionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="secondary" className="w-full border-dashed" onClick={() => setOpen((x) => !x)}><Plus className="size-4" /> Thêm khối nội dung</Button>
      {open && (
        <div className="absolute inset-x-0 top-12 z-20 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-2 shadow-lift">
          {(Object.keys(SECTION_LABEL) as SectionType[]).map((t) => (
            <button key={t} onClick={() => { onAdd(t); setOpen(false); }} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-stone-50">{SECTION_LABEL[t]}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemList<T>({ items, set, render, make, max }: { items: T[]; set: (l: T[]) => void; render: (it: T, upd: (p: Partial<T>) => void) => React.ReactNode; make: () => T; max: number }) {
  const r = useReorder(items, set);
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} {...r.handlers(i)} className={cx("flex gap-2 rounded-xl border bg-stone-50/60 p-2.5", r.over === i ? "border-brand" : "border-line")}>
          <GripVertical className="mt-2 size-4 shrink-0 cursor-grab text-ink-3" />
          <div className="min-w-0 flex-1 space-y-2">{render(it, (p) => set(items.map((x, j) => (j === i ? { ...x, ...p } : x))))}</div>
          <button onClick={() => set(items.filter((_, j) => j !== i))} className="h-fit rounded-lg p-1.5 text-ink-3 hover:bg-red-50 hover:text-bad"><Trash2 className="size-4" /></button>
        </div>
      ))}
      {items.length < max && <Button size="sm" variant="ghost" onClick={() => set([...items, make()])}><Plus className="size-3.5" /> Thêm mục</Button>}
    </div>
  );
}

function SectionForm({ s, upd }: { s: HomeSection; upd: (p: Partial<HomeSection>) => void }) {
  switch (s.type) {
    case "hero":
      return (
        <>
          <Field label="Nhãn nhỏ phía trên"><Input value={s.badge} onChange={(e) => upd({ badge: e.target.value })} /></Field>
          <Field label="Tiêu đề lớn"><Textarea rows={2} value={s.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
          <Field label="Cụm từ được tô gradient" hint="Phải nằm trong tiêu đề"><Input value={s.highlight} onChange={(e) => upd({ highlight: e.target.value })} /></Field>
          <Field label="Mô tả"><Textarea rows={3} value={s.subtitle} onChange={(e) => upd({ subtitle: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nút chính"><Input value={s.ctaPrimary} onChange={(e) => upd({ ctaPrimary: e.target.value })} /></Field>
            <Field label="Nút phụ"><Input value={s.ctaSecondary} onChange={(e) => upd({ ctaSecondary: e.target.value })} /></Field>
          </div>
          <ImageField label="Ảnh minh hoạ bên phải" value={s.image} onChange={(u) => upd({ image: u })} hint="Để trống: dùng ảnh mô phỏng mặc định" />
        </>
      );
    case "steps":
      return (
        <>
          <Field label="Tiêu đề khối (không bắt buộc)"><Input value={s.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
          <ItemList items={s.items} max={6} set={(items) => upd({ items })} make={() => ({ title: "Bước mới", desc: "" })} render={(it, u) => (
            <>
              <Input className="h-9 text-sm" value={it.title} onChange={(e) => u({ title: e.target.value })} placeholder="Tiêu đề" />
              <Textarea rows={2} className="text-sm" value={it.desc} onChange={(e) => u({ desc: e.target.value })} placeholder="Mô tả" />
            </>
          )} />
        </>
      );
    case "features":
      return (
        <>
          <Field label="Tiêu đề khối"><Textarea rows={2} value={s.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
          <ItemList items={s.items} max={12} set={(items) => upd({ items })} make={() => ({ icon: "sparkles" as const, title: "Tính năng mới", desc: "" })} render={(it, u) => {
            const I = ICONS[it.icon];
            return (
              <>
                <div className="flex gap-2">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand"><I className="size-4" /></span>
                    <Select className="h-9 w-[110px] pl-8 text-xs" value={it.icon} onChange={(e) => u({ icon: e.target.value as typeof it.icon })}>
                      {FEATURE_ICONS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </Select>
                  </div>
                  <Input className="h-9 text-sm" value={it.title} onChange={(e) => u({ title: e.target.value })} placeholder="Tiêu đề" />
                </div>
                <Textarea rows={2} className="text-sm" value={it.desc} onChange={(e) => u({ desc: e.target.value })} placeholder="Mô tả" />
              </>
            );
          }} />
        </>
      );
    case "cta":
      return (
        <>
          <Field label="Tiêu đề"><Textarea rows={2} value={s.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
          <Field label="Mô tả"><Textarea rows={2} value={s.desc} onChange={(e) => upd({ desc: e.target.value })} /></Field>
          <Field label="Chữ trên nút"><Input value={s.button} onChange={(e) => upd({ button: e.target.value })} /></Field>
        </>
      );
    case "text":
      return (
        <>
          <Field label="Tiêu đề"><Input value={s.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
          <Field label="Nội dung"><Textarea rows={6} value={s.body} onChange={(e) => upd({ body: e.target.value })} /></Field>
        </>
      );
  }
}

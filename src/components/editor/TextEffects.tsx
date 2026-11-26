"use client";
import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { drawText } from "@/lib/client/textfx";
import { EFFECT_LABEL, FONTS, TEXT_EFFECTS, type TextEffect, type TextField } from "@/lib/types";
import { cx, Field, Switch } from "../ui";

/** Tiny live preview of a text effect, drawn with the real engine. */
export function FxSwatch({ t, effect, label = "Aa", dark, size = 56 }: { t: TextField; effect: TextEffect; label?: string; dark?: boolean; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const W = size * 2.4, H = size * 1.7;
    c.width = W;
    c.height = H;
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, W, H);
    const draw = () => drawText(x, { ...t, effect, x: W / 2, y: H / 2, align: "center", maxWidth: W * 0.8, fontSize: size, curve: 0, letterSpacing: Math.min(t.letterSpacing, 10) }, label);
    draw();
    document.fonts.load(`${t.weight} ${size}px ${FONTS[t.font].css}`).then(() => { x.clearRect(0, 0, W, H); draw(); }).catch(() => {});
  }, [t, effect, label, size]);
  return <canvas ref={ref} className={cx("h-[52px] w-[76px] rounded-lg", dark ? "bg-stone-800" : "bg-stone-100")} />;
}

function Swatches({ colors, onChange }: { colors: string[]; onChange: (c: string[]) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map((c, i) => (
        <span key={i} className="group relative">
          <span className="block size-8 rounded-full ring-1 ring-black/10" style={{ background: c }} />
          <button type="button" onClick={() => onChange(colors.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 hidden size-4 place-items-center rounded-full bg-ink text-white group-hover:grid"><X className="size-3" /></button>
        </span>
      ))}
      {colors.length < 12 && (
        <label className="grid size-8 cursor-pointer place-items-center rounded-full border border-dashed border-stone-300 text-ink-3 hover:border-brand hover:text-brand">
          <Plus className="size-4" />
          <input type="color" className="sr-only" onChange={(e) => onChange([...colors, e.target.value])} />
        </label>
      )}
    </div>
  );
}

export function TextEffectsPanel({ t, upd }: { t: TextField; upd: (p: Partial<TextField>) => void }) {
  const darkText = parseInt(t.color.slice(1, 3), 16) + parseInt(t.color.slice(3, 5), 16) + parseInt(t.color.slice(5, 7), 16) > 600;
  const needsColor = ["shadow", "outline", "neon", "echo", "splice", "background", "3d"].includes(t.effect);
  const colorLabel: Partial<Record<TextEffect, string>> = { shadow: "Màu bóng", outline: "Màu viền", neon: "Màu phát sáng", echo: "Màu vọng", splice: "Màu lớp tách", background: "Màu nền chữ", "3d": "Màu khối 3D" };
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-stone-50/60 p-4 sm:col-span-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Hiệu ứng chữ</div>
        <span className="text-xs text-ink-3">Áp dụng cả khi xuất ảnh</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {TEXT_EFFECTS.map((e) => (
          <button key={e} type="button" onClick={() => upd({ effect: e })} className={cx("rounded-xl border-2 p-1 text-center transition", t.effect === e ? "border-brand bg-white" : "border-transparent hover:border-line")}>
            <FxSwatch t={t} effect={e} dark={darkText} size={26} />
            <span className="mt-1 block truncate text-[11px] font-medium text-ink-2">{EFFECT_LABEL[e]}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {needsColor && (
          <Field label={colorLabel[t.effect] || "Màu hiệu ứng"}>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-1.5"><input type="color" value={t.effectColor} onChange={(e) => upd({ effectColor: e.target.value })} className="h-8 w-10" /><span className="font-mono text-xs text-ink-3">{t.effectColor}</span></div>
          </Field>
        )}
        {t.effect === "gradient" && (
          <Field label="Màu kết thúc gradient">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-1.5"><input type="color" value={t.gradientTo} onChange={(e) => upd({ gradientTo: e.target.value })} className="h-8 w-10" /><span className="font-mono text-xs text-ink-3">{t.color} → {t.gradientTo}</span></div>
          </Field>
        )}
        {t.effect !== "none" && (
          <Field label={`Cường độ: ${t.intensity}`}>
            <input type="range" min={0} max={100} value={t.intensity} onChange={(e) => upd({ intensity: +e.target.value })} className="mt-3 w-full" />
          </Field>
        )}
        <Field label={`Khoảng cách chữ: ${t.letterSpacing}`}>
          <input type="range" min={-10} max={60} value={t.letterSpacing} onChange={(e) => upd({ letterSpacing: +e.target.value })} className="mt-3 w-full" />
        </Field>
        <Field label={`Uốn cong: ${t.curve > 0 ? "∩ " : t.curve < 0 ? "∪ " : ""}${Math.abs(t.curve)}`} hint="Kéo về giữa để chữ thẳng">
          <input type="range" min={-100} max={100} value={t.curve} onChange={(e) => upd({ curve: Math.abs(+e.target.value) < 4 ? 0 : +e.target.value })} className="mt-3 w-full" />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><Switch checked={t.italic} onChange={(v) => upd({ italic: v })} /> In nghiêng</label>
      </div>
      <div className="space-y-3 border-t border-line pt-4">
        <label className="flex items-center justify-between gap-3">
          <span><span className="block text-sm font-medium">Cho khách tự chọn màu & hiệu ứng</span><span className="text-xs text-ink-3">Khi nhập, khách thấy bảng màu và hiệu ứng bên dưới để tự trang trí tên</span></span>
          <Switch checked={t.guestStyle} onChange={(v) => upd({ guestStyle: v })} />
        </label>
        {t.guestStyle && (
          <Field label="Bảng màu cho khách">
            <Swatches colors={t.guestColors} onChange={(c) => upd({ guestColors: c })} />
          </Field>
        )}
      </div>
    </div>
  );
}

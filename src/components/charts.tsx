"use client";
import { useMemo, useRef, useState } from "react";

const C_VIEW = "#2F5BEA";
const C_DL = "#F2622B";
const fmt = (n: number) => n.toLocaleString("vi-VN");

export function TrendChart({ data }: { data: { date: string; view: number; download: number }[] }) {
  const W = 720, H = 220, P = { l: 36, r: 12, t: 12, b: 26 };
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const max = useMemo(() => {
    const m = Math.max(1, ...data.map((d) => Math.max(d.view, d.download)));
    const pow = 10 ** Math.floor(Math.log10(m));
    return Math.ceil(m / pow) * pow;
  }, [data]);
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b);
  const line = (k: "view" | "download") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join("");
  const area = (k: "view" | "download") => `${line(k)}L${x(data.length - 1)},${H - P.b}L${x(0)},${H - P.b}Z`;
  const ticks = [0, max / 2, max];

  function onMove(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C_VIEW }} />Lượt xem</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C_DL }} />Lượt tạo ảnh</span>
      </div>
      <div className="relative">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Biểu đồ lượt xem và lượt tạo ảnh theo ngày">
          <defs>
            <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C_VIEW} stopOpacity=".14" /><stop offset="1" stopColor={C_VIEW} stopOpacity="0" /></linearGradient>
            <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C_DL} stopOpacity=".16" /><stop offset="1" stopColor={C_DL} stopOpacity="0" /></linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeDasharray={t ? "3 4" : undefined} />
              <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#78716c">{fmt(t)}</text>
            </g>
          ))}
          {data.map((d, i) =>
            i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
              <text key={d.date} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#78716c">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</text>
            ) : null,
          )}
          <path d={area("view")} fill="url(#gv)" />
          <path d={area("download")} fill="url(#gd)" />
          <path d={line("view")} fill="none" stroke={C_VIEW} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={line("download")} fill="none" stroke={C_DL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#a8a29e" strokeDasharray="2 3" />
              <circle cx={x(hover)} cy={y(h.view)} r="4.5" fill={C_VIEW} stroke="#fff" strokeWidth="2" />
              <circle cx={x(hover)} cy={y(h.download)} r="4.5" fill={C_DL} stroke="#fff" strokeWidth="2" />
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lift"
            style={{ left: `${Math.min(85, Math.max(15, (x(hover) / W) * 100))}%` }}
          >
            <div className="mb-1 font-semibold text-ink">{h.date.split("-").reverse().join("/")}</div>
            <div className="flex justify-between gap-4 text-ink-2"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: C_VIEW }} />Xem</span><b className="text-ink">{fmt(h.view)}</b></div>
            <div className="flex justify-between gap-4 text-ink-2"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: C_DL }} />Tạo ảnh</span><b className="text-ink">{fmt(h.download)}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BarList({ items, empty = "Chưa có dữ liệu" }: { items: { label: string; value: number }[]; empty?: string }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-3">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="group" title={`${i.label}: ${fmt(i.value)}`}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="truncate text-ink-2">{i.label}</span>
            <span className="tabular-nums text-ink"><b>{fmt(i.value)}</b> <span className="text-ink-3">· {total ? Math.round((i.value / total) * 100) : 0}%</span></span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div className="h-2 rounded-full transition-all group-hover:opacity-80" style={{ width: `${(i.value / max) * 100}%`, background: C_VIEW }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HourBars({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const [h, setH] = useState<number | null>(null);
  return (
    <div>
      <div className="mb-2 h-4 text-xs text-ink-2">{h !== null ? <><b className="text-ink">{h}h–{h + 1}h</b>: {fmt(hours[h])} lượt tạo ảnh</> : "Rê chuột vào cột để xem chi tiết"}</div>
      <div className="flex h-28 items-end gap-[2px]" onPointerLeave={() => setH(null)}>
        {hours.map((v, i) => (
          <div key={i} className="flex h-full flex-1 items-end" onPointerEnter={() => setH(i)}>
            <div className="w-full rounded-t-[4px] transition-opacity" style={{ height: `${Math.max(2, (v / max) * 100)}%`, background: C_DL, opacity: h === null || h === i ? 1 : 0.35 }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-3"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="text-[13px] text-ink-3">{label}</div>
      <div className={`mt-1 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${accent ? "text-brand" : ""}`}>{typeof value === "number" ? fmt(value) : value}</div>
      {sub && <div className="mt-1 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

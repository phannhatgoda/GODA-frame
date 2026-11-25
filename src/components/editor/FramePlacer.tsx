"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { emptyPhoto, loadImage, render, type PhotoState } from "@/lib/client/render";
import { FONTS, type FrameConfig, type TextField } from "@/lib/types";
import { cx } from "../ui";

function placeholderPerson() {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 800;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 800, 800);
  g.addColorStop(0, "#d6d3d1");
  g.addColorStop(1, "#a8a29e");
  x.fillStyle = g;
  x.fillRect(0, 0, 800, 800);
  x.fillStyle = "#f5f5f4";
  x.beginPath();
  x.ellipse(400, 330, 130, 155, 0, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.ellipse(400, 820, 300, 280, 0, 0, Math.PI * 2);
  x.fill();
  return c;
}

type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type Box = { x: number; y: number; w: number; h: number };
type Drag = { id: string; handle: Handle; sx: number; sy: number; box: Box; text?: TextField };

const HANDLES: { h: Handle; cls: string; cursor: string }[] = [
  { h: "nw", cls: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
  { h: "n", cls: "left-1/2 -top-1.5 -translate-x-1/2", cursor: "ns-resize" },
  { h: "ne", cls: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
  { h: "e", cls: "-right-1.5 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { h: "se", cls: "-right-1.5 -bottom-1.5", cursor: "nwse-resize" },
  { h: "s", cls: "left-1/2 -bottom-1.5 -translate-x-1/2", cursor: "ns-resize" },
  { h: "sw", cls: "-left-1.5 -bottom-1.5", cursor: "nesw-resize" },
  { h: "w", cls: "-left-1.5 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

function textBox(t: TextField): Box {
  const left = t.align === "center" ? t.x - t.maxWidth / 2 : t.align === "left" ? t.x : t.x - t.maxWidth;
  const h = t.fontSize * 1.4;
  return { x: left, y: t.y - h / 2, w: t.maxWidth, h };
}

export function FramePlacer({ cfg, onChange, selected, onSelect }: { cfg: FrameConfig; onChange: (c: FrameConfig) => void; selected: string | null; onSelect: (id: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<HTMLImageElement | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const [snap, setSnap] = useState<{ v?: boolean; h?: boolean }>({});
  const drag = useRef<Drag | null>(null);
  const photo = useMemo<PhotoState>(() => {
    if (typeof document === "undefined") return emptyPhoto();
    return { ...emptyPhoto(), img: placeholderPerson(), natW: 800, natH: 800 };
  }, []);

  useEffect(() => {
    if (!cfg.frameUrl) return setFrame(null);
    loadImage(cfg.frameUrl).then(setFrame).catch(() => setFrame(null));
  }, [cfg.frameUrl]);

  // load the web fonts used by text fields, then re-render
  useEffect(() => {
    const ids = [...new Set(cfg.texts.map((t) => t.font))];
    if (!ids.length) return;
    const id = "goda-fonts-" + ids.join("-");
    let link = document.getElementById(id) as HTMLLinkElement | null;
    const sheetReady = new Promise<void>((resolve) => {
      if (link?.dataset.loaded) return resolve();
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?${ids.map((i) => "family=" + FONTS[i].google).join("&")}&display=swap`;
        document.head.appendChild(link);
      }
      const l = link;
      l.addEventListener("load", () => { l.dataset.loaded = "1"; resolve(); }, { once: true });
      l.addEventListener("error", () => resolve(), { once: true });
    });
    let alive = true;
    sheetReady
      .then(() => Promise.all(cfg.texts.map((t) => document.fonts.load(`${t.weight} 40px ${FONTS[t.font].css}`).catch(() => {}))))
      .then(() => alive && setFontTick((x) => x + 1));
    return () => { alive = false; };
  }, [cfg.texts]);

  // canvas shows frame + sample person + placeholder text in the real style
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const values = Object.fromEntries(cfg.texts.map((t) => [t.id, t.defaultValue || t.placeholder || t.label]));
    render(c.getContext("2d")!, cfg, { frame, photo, values });
  }, [cfg, frame, photo, fontTick]);

  const ratio = () => cfg.width / (wrapRef.current?.clientWidth || cfg.width);

  function start(e: React.PointerEvent, id: string, handle: Handle) {
    e.stopPropagation();
    e.preventDefault();
    onSelect(id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const t = cfg.texts.find((x) => x.id === id);
    const box = id === "photo" ? { x: cfg.photo.x, y: cfg.photo.y, w: cfg.photo.w, h: cfg.photo.h } : textBox(t!);
    drag.current = { id, handle, sx: e.clientX, sy: e.clientY, box, text: t };
  }

  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const r = ratio();
    const dx = (e.clientX - d.sx) * r;
    const dy = (e.clientY - d.sy) * r;
    let { x, y, w, h } = d.box;
    const H = d.handle;
    const lockRatio = d.id === "photo" && cfg.photo.shape === "circle" && H.length === 2;
    if (H === "move") {
      x += dx;
      y += dy;
    } else {
      if (H.includes("e")) w = Math.max(30, w + dx);
      if (H.includes("w")) { const nw = Math.max(30, w - dx); x += w - nw; w = nw; }
      if (H.includes("s")) h = Math.max(20, h + dy);
      if (H.includes("n")) { const nh = Math.max(20, h - dy); y += h - nh; h = nh; }
      if (lockRatio) {
        const s = Math.max(w / d.box.w, h / d.box.h);
        const nw = d.box.w * s, nh = d.box.h * s;
        if (H.includes("w")) x = d.box.x + d.box.w - nw;
        if (H.includes("n")) y = d.box.y + d.box.h - nh;
        w = nw; h = nh;
      }
    }
    // snap centre to the frame's centre lines
    const tol = cfg.width * 0.012;
    const s: { v?: boolean; h?: boolean } = {};
    if (Math.abs(x + w / 2 - cfg.width / 2) < tol) { if (H === "move") x = cfg.width / 2 - w / 2; s.v = true; }
    if (Math.abs(y + h / 2 - cfg.height / 2) < tol) { if (H === "move") y = cfg.height / 2 - h / 2; s.h = true; }
    setSnap(s);

    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (d.id === "photo") {
      onChange({ ...cfg, photo: { ...cfg.photo, x, y, w, h } });
    } else {
      const t = d.text!;
      // vertical handles change font size, horizontal handles change the text box width
      const fontSize = H === "move" || (!H.includes("n") && !H.includes("s")) ? t.fontSize : Math.max(10, Math.round(h / 1.4));
      const realH = fontSize * 1.4;
      const cy = H.includes("n") ? d.box.y + d.box.h - realH / 2 : H.includes("s") ? d.box.y + realH / 2 : y + h / 2;
      const nx = t.align === "center" ? x + w / 2 : t.align === "left" ? x : x + w;
      onChange({ ...cfg, texts: cfg.texts.map((tt) => (tt.id === t.id ? { ...tt, x: Math.round(nx), y: Math.round(cy), maxWidth: w, fontSize } : tt)) });
    }
  }
  function end() {
    drag.current = null;
    setSnap({});
  }

  // arrow keys nudge the selected element
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!selected || (e.target as HTMLElement)?.closest("input,textarea,select")) return;
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      if (selected === "photo") onChange({ ...cfg, photo: { ...cfg.photo, x: cfg.photo.x + d[0], y: cfg.photo.y + d[1] } });
      else onChange({ ...cfg, texts: cfg.texts.map((t) => (t.id === selected ? { ...t, x: t.x + d[0], y: t.y + d[1] } : t)) });
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [selected, cfg, onChange]);

  const pct = (b: Box) => ({ left: `${(b.x / cfg.width) * 100}%`, top: `${(b.y / cfg.height) * 100}%`, width: `${(b.w / cfg.width) * 100}%`, height: `${(b.h / cfg.height) * 100}%` });

  const boxes: { id: string; box: Box; kind: "photo" | "text"; label: string; round?: boolean }[] = [
    ...(cfg.photo.enabled ? [{ id: "photo", box: { x: cfg.photo.x, y: cfg.photo.y, w: cfg.photo.w, h: cfg.photo.h }, kind: "photo" as const, label: "Ảnh", round: cfg.photo.shape === "circle" }] : []),
    ...cfg.texts.map((t) => ({ id: t.id, box: textBox(t), kind: "text" as const, label: t.label })),
  ];

  return (
    <div
      ref={wrapRef}
      className="checker relative select-none overflow-hidden rounded-2xl border border-line touch-none"
      onPointerDown={() => onSelect(null)}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <canvas ref={canvasRef} width={cfg.width} height={cfg.height} className="pointer-events-none block h-auto w-full" />
      {snap.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-fuchsia-500" />}
      {snap.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-fuchsia-500" />}
      {boxes.map((b) => {
        const sel = selected === b.id;
        const color = b.kind === "photo" ? "#FF5A1F" : "#2346FF";
        return (
          <div
            key={b.id}
            className={cx("group absolute cursor-move", sel ? "z-20" : "z-10")}
            style={pct(b.box)}
            onPointerDown={(e) => start(e, b.id, "move")}
          >
            <div
              className={cx("absolute inset-0 border-2 transition", b.round && "rounded-full", sel ? "border-solid" : "border-dashed opacity-60 group-hover:opacity-100")}
              style={{ borderColor: color, background: sel ? color + "0f" : "transparent" }}
            />
            {b.round && sel && <div className="absolute inset-0 border border-dashed opacity-40" style={{ borderColor: color }} />}
            <span className={cx("absolute -top-6 left-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white transition", sel ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ background: color }}>
              {b.label} · {Math.round(b.box.w)}×{Math.round(b.box.h)}
            </span>
            {sel &&
              HANDLES.map((h) => (
                <span
                  key={h.h}
                  onPointerDown={(e) => start(e, b.id, h.h)}
                  className={cx("absolute size-3.5 rounded-full border-2 border-white shadow-md", h.cls)}
                  style={{ background: color, cursor: h.cursor }}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

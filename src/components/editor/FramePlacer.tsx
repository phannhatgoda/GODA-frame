"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { emptyPhoto, loadImage, render, type PhotoState } from "@/lib/client/render";
import { FONTS, type FrameConfig } from "@/lib/types";

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

type Drag = { kind: "move" | "resize"; id: string; sx: number; sy: number; orig: { x: number; y: number; w?: number; h?: number } };

export function FramePlacer({ cfg, onChange, selected, onSelect }: { cfg: FrameConfig; onChange: (c: FrameConfig) => void; selected: string | null; onSelect: (id: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<HTMLImageElement | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const drag = useRef<Drag | null>(null);
  const photo = useMemo<PhotoState>(() => {
    if (typeof document === "undefined") return emptyPhoto();
    const p = placeholderPerson();
    return { ...emptyPhoto(), img: p, natW: 800, natH: 800 };
  }, []);

  useEffect(() => {
    if (!cfg.frameUrl) return setFrame(null);
    loadImage(cfg.frameUrl).then(setFrame).catch(() => setFrame(null));
  }, [cfg.frameUrl]);

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

  const handle = Math.max(28, cfg.width * 0.035);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    render(ctx, cfg, { frame, photo, values: {}, guides: true, selected });
    if (selected === "photo" && cfg.photo.enabled) {
      const { x, y, w, h } = cfg.photo;
      ctx.fillStyle = "#FF5A1F";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = handle * 0.12;
      ctx.beginPath();
      ctx.arc(x + w, y + h, handle / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [cfg, frame, photo, selected, handle, fontTick]);

  function toFrame(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * cfg.width, y: ((e.clientY - r.top) / r.height) * cfg.height };
  }

  function hit(px: number, py: number): { id: string; kind: "move" | "resize" } | null {
    const p = cfg.photo;
    if (p.enabled && selected === "photo" && Math.hypot(px - (p.x + p.w), py - (p.y + p.h)) < handle) return { id: "photo", kind: "resize" };
    for (const t of [...cfg.texts].reverse()) {
      const left = t.align === "center" ? t.x - t.maxWidth / 2 : t.align === "left" ? t.x : t.x - t.maxWidth;
      if (px >= left && px <= left + t.maxWidth && Math.abs(py - t.y) <= t.fontSize * 0.7) return { id: t.id, kind: "move" };
    }
    if (p.enabled && px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return { id: "photo", kind: "move" };
    return null;
  }

  function down(e: React.PointerEvent) {
    const { x, y } = toFrame(e);
    const h = hit(x, y);
    onSelect(h?.id ?? null);
    if (!h) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const orig = h.id === "photo" ? { x: cfg.photo.x, y: cfg.photo.y, w: cfg.photo.w, h: cfg.photo.h } : (() => { const t = cfg.texts.find((t) => t.id === h.id)!; return { x: t.x, y: t.y }; })();
    drag.current = { kind: h.kind, id: h.id, sx: x, sy: y, orig };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    const { x, y } = toFrame(e);
    if (!d) {
      const h = hit(x, y);
      ref.current!.style.cursor = h ? (h.kind === "resize" ? "nwse-resize" : "move") : "default";
      return;
    }
    const dx = Math.round(x - d.sx), dy = Math.round(y - d.sy);
    if (d.id === "photo") {
      const p = { ...cfg.photo };
      if (d.kind === "move") {
        p.x = d.orig.x + dx;
        p.y = d.orig.y + dy;
      } else {
        p.w = Math.max(40, (d.orig.w || 0) + dx);
        p.h = p.shape === "circle" && e.shiftKey === false ? p.w * ((d.orig.h || 1) / (d.orig.w || 1)) : Math.max(40, (d.orig.h || 0) + dy);
        if (e.shiftKey) p.h = Math.max(40, (d.orig.h || 0) + dy);
      }
      onChange({ ...cfg, photo: p });
    } else {
      onChange({ ...cfg, texts: cfg.texts.map((t) => (t.id === d.id ? { ...t, x: d.orig.x + dx, y: d.orig.y + dy } : t)) });
    }
  }
  const up = () => (drag.current = null);

  return (
    <div className="checker overflow-hidden rounded-2xl border border-line">
      <canvas
        ref={ref}
        width={cfg.width}
        height={cfg.height}
        className="block h-auto w-full touch-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
    </div>
  );
}

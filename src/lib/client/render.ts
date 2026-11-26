"use client";
import { type FrameConfig, type TextField } from "../types";
import { drawText, fitSize } from "./textfx";

export interface PhotoState {
  img: CanvasImageSource | null; // original or AI cutout
  natW: number;
  natH: number;
  scale: number; // relative to "cover" fit of photo slot
  dx: number; // offset in frame px
  dy: number;
  rotate: number; // degrees
  filter: string; // CSS filter string
  bg: { mode: "none" | "color" | "blur"; color: string; source: CanvasImageSource | null };
}

export const emptyPhoto = (): PhotoState => ({
  img: null, natW: 0, natH: 0, scale: 1, dx: 0, dy: 0, rotate: 0, filter: "none",
  bg: { mode: "none", color: "#ffffff", source: null },
});

const imgCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  if (!imgCache.has(src)) {
    imgCache.set(
      src,
      new Promise((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.decoding = "async";
        i.onload = () => resolve(i);
        i.onerror = () => {
          imgCache.delete(src);
          reject(new Error("Không tải được ảnh: " + src));
        };
        i.src = src;
      }),
    );
  }
  return imgCache.get(src)!;
}

function slotPath(ctx: CanvasRenderingContext2D, cfg: FrameConfig) {
  const { x, y, w, h, shape } = cfg.photo;
  ctx.beginPath();
  if (shape === "circle") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === "rounded") ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.08);
  else ctx.rect(x, y, w, h);
}

/** Base scale so the photo covers the slot at scale=1. */
export function coverScale(cfg: FrameConfig, natW: number, natH: number) {
  return Math.max(cfg.photo.w / natW, cfg.photo.h / natH);
}

function drawPhoto(ctx: CanvasRenderingContext2D, cfg: FrameConfig, p: PhotoState) {
  if (!p.img || !cfg.photo.enabled) return;
  const { x, y, w, h } = cfg.photo;
  const s = coverScale(cfg, p.natW, p.natH) * p.scale;
  const cx = x + w / 2 + p.dx;
  const cy = y + h / 2 + p.dy;
  ctx.save();
  slotPath(ctx, cfg);
  ctx.clip();
  if (p.bg.mode === "color") {
    ctx.fillStyle = p.bg.color;
    ctx.fillRect(x, y, w, h);
  }
  const place = (img: CanvasImageSource, filter: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((p.rotate * Math.PI) / 180);
    ctx.filter = filter;
    ctx.drawImage(img, (-p.natW * s) / 2, (-p.natH * s) / 2, p.natW * s, p.natH * s);
    ctx.restore();
  };
  if (p.bg.mode === "blur" && p.bg.source) {
    const blurPx = Math.max(6, Math.round(Math.min(w, h) * 0.025));
    place(p.bg.source, `${p.filter === "none" ? "" : p.filter} blur(${blurPx}px) brightness(1.03)`.trim());
  }
  place(p.img, p.filter);
  ctx.restore();
}

export function fitText(ctx: CanvasRenderingContext2D, t: TextField, text: string) {
  return fitSize(ctx, t, text);
}

function drawTexts(ctx: CanvasRenderingContext2D, cfg: FrameConfig, values: Record<string, string>, guides: boolean, hide?: string | null) {
  for (const t of cfg.texts) {
    if (t.id === hide) continue;
    let text = (values[t.id] ?? "").trim() || t.defaultValue || (guides ? t.placeholder : "");
    if (!text) continue;
    if (t.uppercase) text = text.toLocaleUpperCase("vi-VN");
    drawText(ctx, t, text, guides && !(values[t.id] ?? "").trim() && !t.defaultValue);
  }
}

export interface RenderOpts {
  frame: HTMLImageElement | null;
  photo: PhotoState;
  values: Record<string, string>;
  guides?: boolean; // show placeholders + slot outline (editor)
  selected?: string | null;
  hideText?: string | null; // field currently being edited inline
}

export function render(ctx: CanvasRenderingContext2D, cfg: FrameConfig, o: RenderOpts) {
  const { width: W, height: H } = cfg;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = cfg.bgFill;
  ctx.fillRect(0, 0, W, H);
  if (cfg.photo.layer === "below") drawPhoto(ctx, cfg, o.photo);
  if (o.frame) ctx.drawImage(o.frame, 0, 0, W, H);
  if (cfg.photo.layer === "above") drawPhoto(ctx, cfg, o.photo);
  drawTexts(ctx, cfg, o.values, !!o.guides, o.hideText);

  if (o.guides) {
    const lw = Math.max(2, W / 360);
    if (cfg.photo.enabled) {
      ctx.save();
      ctx.setLineDash([lw * 5, lw * 4]);
      ctx.lineWidth = lw;
      ctx.strokeStyle = o.selected === "photo" ? "#FF5A1F" : "rgba(255,90,31,.6)";
      slotPath(ctx, cfg);
      ctx.stroke();
      ctx.restore();
    }
    for (const t of cfg.texts) {
      if (o.selected !== t.id) continue;
      const half = t.maxWidth / 2;
      const left = t.align === "center" ? t.x - half : t.align === "left" ? t.x : t.x - t.maxWidth;
      ctx.save();
      ctx.setLineDash([lw * 5, lw * 4]);
      ctx.lineWidth = lw;
      ctx.strokeStyle = "#2346FF";
      ctx.strokeRect(left, t.y - t.fontSize * 0.7, t.maxWidth, t.fontSize * 1.4);
      ctx.restore();
    }
  }
}

/** Scan alpha channel of the frame to find the largest transparent window → auto photo slot. */
export function detectTransparentSlot(img: HTMLImageElement, W: number, H: number) {
  const scale = Math.min(1, 400 / Math.max(W, H));
  const w = Math.round(W * scale), h = Math.round(H * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  // flood fill from center-most transparent pixel
  const transparent = (i: number) => d[i * 4 + 3] < 40;
  let start = -1;
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let r = 0; r < Math.max(w, h) / 2 && start < 0; r += 2) {
    for (const [px, py] of [[cx, cy - r], [cx, cy + r], [cx - r, cy], [cx + r, cy]]) {
      if (px >= 0 && py >= 0 && px < w && py < h && transparent(py * w + px)) { start = py * w + px; break; }
    }
  }
  if (start < 0) return null;
  const seen = new Uint8Array(w * h);
  const stack = [start];
  let minX = w, minY = h, maxX = 0, maxY = 0, count = 0;
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i] || !transparent(i)) continue;
    seen[i] = 1; count++;
    const px = i % w, py = (i / w) | 0;
    if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
    if (px > 0) stack.push(i - 1); if (px < w - 1) stack.push(i + 1);
    if (py > 0) stack.push(i - w); if (py < h - 1) stack.push(i + w);
  }
  if (count < w * h * 0.02) return null;
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const fill = count / (bw * bh);
  const touchesAll = minX <= 1 && minY <= 1 && maxX >= w - 2 && maxY >= h - 2;
  return {
    x: Math.round(minX / scale), y: Math.round(minY / scale), w: Math.round(bw / scale), h: Math.round(bh / scale),
    shape: (touchesAll ? "rect" : fill > 0.74 && fill < 0.83 ? "circle" : "rect") as "rect" | "circle",
  };
}

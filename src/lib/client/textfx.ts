"use client";
// Canva-style text effects on <canvas>. One engine for the editor, the guest page and the exported file.
import { FONTS, TEXT_FX_DEFAULT, type TextField } from "../types";

type Glyph = { ch: string; x: number; y: number; rot: number };
interface Layout { glyphs: Glyph[] | null; width: number; left: number; size: number }

const fontOf = (t: TextField, size: number) => `${t.italic ? "italic " : ""}${t.weight} ${size}px ${FONTS[t.font]?.css || "sans-serif"}`;

function hexA(hex: string, a: number) {
  const n = parseInt((hex || "#000000").slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function measure(ctx: CanvasRenderingContext2D, t: TextField, text: string, size: number) {
  ctx.font = fontOf(t, size);
  const sp = ((t.letterSpacing ?? 0) / 100) * size;
  const chars = [...text];
  if (!sp) return { width: ctx.measureText(text).width, sp, chars };
  return { width: chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + sp * Math.max(0, chars.length - 1), sp, chars };
}

/** Largest font size (≤ field size) that fits the field width, accounting for spacing & effects. */
export function fitSize(ctx: CanvasRenderingContext2D, t: TextField, text: string) {
  let size = t.fontSize;
  const pad = t.effect === "background" ? 0.9 : t.effect === "echo" || t.effect === "3d" ? 0.92 : 1;
  for (let i = 0; i < 40; i++) {
    if (measure(ctx, t, text, size).width <= t.maxWidth * pad || size <= 10) break;
    size *= 0.94;
  }
  return size;
}

function layout(ctx: CanvasRenderingContext2D, t: TextField, text: string): Layout {
  const size = fitSize(ctx, t, text);
  const { width, sp, chars } = measure(ctx, t, text, size);
  const cx = t.align === "center" ? t.x : t.align === "left" ? t.x + width / 2 : t.x - width / 2;
  const left = cx - width / 2;
  const curve = t.curve ?? 0;
  if (!sp && !curve) return { glyphs: null, width, left, size };

  const glyphs: Glyph[] = [];
  let s = 0;
  const theta = (Math.abs(curve) / 100) * Math.PI; // total arc angle, up to a half circle
  const R = theta > 0.01 ? width / theta : 0;
  for (const ch of chars) {
    const w = ctx.measureText(ch).width;
    const mid = s + w / 2;
    if (!R) {
      glyphs.push({ ch, x: left + mid, y: t.y, rot: 0 });
    } else {
      const a = (mid - width / 2) / R;
      if (curve > 0) glyphs.push({ ch, x: cx + R * Math.sin(a), y: t.y + R - R * Math.cos(a), rot: a }); // ∩ arch
      else glyphs.push({ ch, x: cx + R * Math.sin(a), y: t.y - R + R * Math.cos(a), rot: -a }); // ∪ smile
    }
    s += w + sp;
  }
  return { glyphs, width, left, size };
}

/** Draw the laid-out text once (fill or stroke), optionally offset. */
function paint(ctx: CanvasRenderingContext2D, L: Layout, t: TextField, text: string, mode: "fill" | "stroke", dx = 0, dy = 0, colorAt?: (u: number) => string) {
  if (!L.glyphs) {
    ctx.textAlign = "left";
    if (mode === "fill") ctx.fillText(text, L.left + dx, t.y + dy);
    else ctx.strokeText(text, L.left + dx, t.y + dy);
    return;
  }
  ctx.textAlign = "center";
  for (const g of L.glyphs) {
    if (!g.rot) {
      // straight text: draw in place so gradients keep their canvas-space coordinates
      if (mode === "fill") ctx.fillText(g.ch, g.x + dx, g.y + dy);
      else ctx.strokeText(g.ch, g.x + dx, g.y + dy);
      continue;
    }
    ctx.save();
    ctx.translate(g.x + dx, g.y + dy);
    ctx.rotate(g.rot);
    if (colorAt) ctx.fillStyle = colorAt((g.x - L.left) / Math.max(1, L.width));
    if (mode === "fill") ctx.fillText(g.ch, 0, 0);
    else ctx.strokeText(g.ch, 0, 0);
    ctx.restore();
  }
}

function mix(a: string, b: string, t: number) {
  const p = (h: string) => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * Math.min(1, Math.max(0, t)))).join(",")})`;
}

export function drawText(ctx: CanvasRenderingContext2D, field: TextField, text: string, ghost = false) {
  const t = { ...TEXT_FX_DEFAULT, ...field };
  const L = layout(ctx, t, text);
  const s = L.size;
  const k = (t.intensity ?? 50) / 100;
  ctx.save();
  ctx.font = fontOf(t, s);
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  if (ghost) ctx.globalAlpha = 0.35;
  const fill = (style: string | CanvasGradient = t.color, dx = 0, dy = 0) => { ctx.fillStyle = style; paint(ctx, L, t, text, "fill", dx, dy); };
  const stroke = (style: string, w: number, dx = 0, dy = 0) => { ctx.strokeStyle = style; ctx.lineWidth = w; paint(ctx, L, t, text, "stroke", dx, dy); };
  const shadow = (color: string, blur: number, dx: number, dy: number) => { ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = dx; ctx.shadowOffsetY = dy; };
  const noShadow = () => shadow("transparent", 0, 0, 0);

  switch (t.effect) {
    case "shadow": {
      const off = s * (0.03 + 0.09 * k);
      shadow(hexA(t.effectColor, 0.35 + 0.5 * k), s * 0.12 * k, off, off);
      fill();
      break;
    }
    case "lift":
      shadow(`rgba(0,0,0,${0.2 + 0.4 * k})`, s * (0.15 + 0.35 * k), 0, s * (0.04 + 0.1 * k));
      fill();
      break;
    case "outline":
      stroke(t.effectColor, s * (0.04 + 0.16 * k));
      fill();
      break;
    case "hollow":
      stroke(t.color, Math.max(1.5, s * (0.02 + 0.06 * k)));
      break;
    case "neon": {
      const glow = t.effectColor === "#000000" ? t.color : t.effectColor;
      for (const b of [0.6, 0.35, 0.15]) {
        shadow(glow, s * b * (0.4 + k), 0, 0);
        fill(glow);
      }
      noShadow();
      fill(hexA("#FFFFFF", 0.85));
      break;
    }
    case "echo": {
      const off = s * (0.04 + 0.06 * k);
      for (const [i, a] of [[3, 0.2], [2, 0.4], [1, 0.65]] as const) fill(hexA(t.effectColor === "#000000" ? t.color : t.effectColor, a), off * i, off * i);
      fill();
      break;
    }
    case "glitch": {
      const off = s * (0.02 + 0.05 * k);
      ctx.globalCompositeOperation = "source-over";
      fill("#00E5FF", -off, 0);
      fill("#FF2BD6", off, 0);
      fill();
      break;
    }
    case "splice": {
      const off = s * (0.04 + 0.06 * k);
      fill(t.effectColor === "#000000" ? hexA(t.color, 0.45) : t.effectColor, off, off);
      stroke(t.color, Math.max(1.5, s * 0.035));
      break;
    }
    case "background": {
      const padX = s * 0.35, padY = s * (0.18 + 0.12 * k);
      const r = Math.min(s * 0.4, (s + padY * 2) / 2) * (0.3 + 0.7 * k);
      ctx.fillStyle = t.effectColor;
      ctx.beginPath();
      ctx.roundRect(L.left - padX, t.y - s * 0.58 - padY, L.width + padX * 2, s * 1.16 + padY * 2, r);
      ctx.fill();
      fill();
      break;
    }
    case "gradient": {
      const g = ctx.createLinearGradient(L.left, t.y - s / 2, L.left + L.width, t.y + s / 2);
      g.addColorStop(0, t.color);
      g.addColorStop(1, t.gradientTo);
      if (k > 0.55) shadow("rgba(0,0,0,.25)", s * 0.12, 0, s * 0.05);
      ctx.fillStyle = g;
      // curved glyphs are rotated individually → colour each glyph along the gradient instead
      paint(ctx, L, t, text, "fill", 0, 0, (u) => mix(t.color, t.gradientTo, u));
      break;
    }
    case "3d": {
      const depth = Math.round(2 + 10 * k);
      const step = s * 0.012;
      for (let i = depth; i >= 1; i--) fill(t.effectColor, step * i, step * i);
      fill();
      break;
    }
    default:
      fill();
  }
  ctx.restore();
  return { left: L.left, width: L.width, size: s };
}

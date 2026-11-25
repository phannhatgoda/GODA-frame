import "server-only";
import { nanoid } from "nanoid";
import { one, run } from "./db";

/**
 * Asset storage in Postgres (BYTEA). Serverless-friendly: no local disk needed.
 * Frames/logos are small (≤ 4 MB after client-side compression) and served with
 * immutable CDN caching, so the DB is hit roughly once per asset per edge region.
 * To scale further, swap these two functions for S3/R2/Vercel Blob.
 */

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
];

/** Detect image type from magic bytes — never trust the client-supplied MIME. SVG is rejected (XSS vector). */
export function sniffImage(buf: Buffer) {
  return SIGNATURES.find((s) => s.test(buf)) ?? null;
}

export async function saveImage(ownerId: string, buf: Buffer) {
  const kind = sniffImage(buf);
  if (!kind) throw new Error("UNSUPPORTED");
  const id = nanoid(16);
  await run("INSERT INTO assets (id, owner_id, mime, size, data, created_at) VALUES (?,?,?,?,?,?)", [
    id, ownerId, kind.mime, buf.length, buf, Date.now(),
  ]);
  return { url: `/api/files/${id}.${kind.ext}`, size: buf.length };
}

export async function readAsset(name: string) {
  const id = name.replace(/\.[a-z]+$/i, "");
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) return null;
  const r = await one<{ mime: string; data: Buffer }>("SELECT mime, data FROM assets WHERE id = ?", [id]);
  return r ? { buf: Buffer.from(r.data), mime: r.mime } : null;
}

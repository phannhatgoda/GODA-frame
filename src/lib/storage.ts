import "server-only";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");

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
  const safeOwner = ownerId.replace(/[^a-zA-Z0-9_-]/g, "");
  const rel = `${safeOwner}/${nanoid(16)}.${kind.ext}`;
  const abs = path.join(UPLOAD_DIR, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buf);
  return { rel, mime: kind.mime, size: buf.length };
}

export async function readUpload(rel: string) {
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (!abs.startsWith(UPLOAD_DIR + path.sep)) return null; // path traversal guard
  try {
    const s = await stat(abs);
    if (!s.isFile()) return null;
    const buf = await readFile(abs);
    const kind = sniffImage(buf);
    if (!kind) return null;
    return { buf, mime: kind.mime };
  } catch {
    return null;
  }
}

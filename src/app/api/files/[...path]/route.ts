import { readUpload } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join("/");
  const f = await readUpload(rel);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.buf), {
    headers: {
      "Content-Type": f.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

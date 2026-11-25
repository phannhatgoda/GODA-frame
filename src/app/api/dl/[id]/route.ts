import { one } from "@/lib/db";

const TTL = 15 * 60_000;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const f = await one<{ name: string; mime: string; data: Buffer; created_at: number }>("SELECT name, mime, data, created_at FROM temp_files WHERE id = ?", [id]);
  if (!f || Date.now() - Number(f.created_at) > TTL) return new Response("Ảnh đã hết hạn, vui lòng tạo lại", { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const inline = new URL(req.url).searchParams.has("inline");
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${f.name}"; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

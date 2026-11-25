import { nanoid } from "nanoid";
import { run } from "@/lib/db";
import { handle, ok, HttpError } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { sniffImage } from "@/lib/storage";
import { getCampaignById } from "@/lib/campaigns";

const MAX = 4 * 1024 * 1024; // serverless body limit
const TTL = 15 * 60_000;

/**
 * In-app browsers (Zalo, Facebook, Instagram…) cannot save `blob:` downloads.
 * The finished image is parked here for 15 minutes and served from a normal URL
 * with `Content-Disposition: attachment`, which their download handlers understand.
 */
export const POST = handle(async (req: Request) => {
  rateLimit(req, "dl", 20, 60_000);
  const q = new URL(req.url).searchParams;
  const c = await getCampaignById(q.get("campaignId") || "");
  if (!c) throw new HttpError(404, "Không tìm thấy chiến dịch");
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > MAX) throw new HttpError(413, "Ảnh quá lớn");
  const kind = sniffImage(buf);
  if (!kind) throw new HttpError(415, "Định dạng không hợp lệ");
  const name = (q.get("name") || `goda-frame.${kind.ext}`).replace(/[^\w.-]+/g, "-").slice(0, 120);
  await run("DELETE FROM temp_files WHERE created_at < ?", [Date.now() - TTL]);
  const id = nanoid(24);
  await run("INSERT INTO temp_files (id, campaign_id, name, mime, data, created_at) VALUES (?,?,?,?,?,?)", [id, c.id, name, kind.mime, buf, Date.now()]);
  return ok({ id, url: `/api/dl/${id}` }, 201);
});

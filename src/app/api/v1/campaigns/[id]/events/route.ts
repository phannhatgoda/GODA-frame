import { all } from "@/lib/db";
import { ok, HttpError } from "@/lib/api";
import { apiKeyUser, CORS, v1 } from "@/lib/apikeys";
import { getCampaignById } from "@/lib/campaigns";
import { EVENT_TYPES } from "@/lib/stats";

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });

/**
 * GET /api/v1/campaigns/:id/events?since=<ms|ISO>&type=download&limit=500
 * Raw event stream (newest first) — use `next_since` to poll incrementally.
 */
export const GET = v1(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await apiKeyUser(req);
  const c = await getCampaignById((await params).id);
  if (!c || c.owner_id !== u.id) throw new HttpError(404, "Không tìm thấy chiến dịch");
  const q = new URL(req.url).searchParams;
  const sinceRaw = q.get("since");
  const since = sinceRaw ? (/^\d+$/.test(sinceRaw) ? Number(sinceRaw) : Date.parse(sinceRaw)) || 0 : 0;
  const type = q.get("type");
  if (type && !EVENT_TYPES.includes(type as never)) throw new HttpError(400, `type phải là một trong: ${EVENT_TYPES.join(", ")}`);
  const limit = Math.min(1000, Math.max(1, Number(q.get("limit")) || 200));
  const rows = await all<{ type: string; visitor_id: string; device: string; source: string; meta: string | null; created_at: number }>(
    `SELECT type, visitor_id, device, source, meta, created_at FROM events WHERE campaign_id = ? AND created_at > ?${type ? " AND type = ?" : ""} ORDER BY created_at DESC LIMIT ?`,
    type ? [c.id, since, type, limit] : [c.id, since, limit],
  );
  const data = rows.map((r) => {
    let names: Record<string, string> | undefined;
    try { names = r.meta ? JSON.parse(r.meta).names : undefined; } catch {}
    return { type: r.type, visitor: r.visitor_id, device: r.device, source: r.source || null, names: names ?? null, at: new Date(Number(r.created_at)).toISOString(), ts: Number(r.created_at) };
  });
  return ok({ data, next_since: data[0]?.ts ?? since });
});

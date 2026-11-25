import { z } from "zod";
import { run } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { getCampaignById } from "@/lib/campaigns";
import { EVENT_TYPES } from "@/lib/stats";

const schema = z.object({
  campaignId: z.string().max(40),
  type: z.enum(EVENT_TYPES as [string, ...string[]]),
  visitorId: z.string().max(40),
  source: z.string().max(80).optional(),
  names: z.record(z.string().max(30), z.string().max(120)).optional(),
});

function device(ua: string) {
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return /iPhone/i.test(ua) ? "iPhone" : "Android";
  return "Desktop";
}

export const POST = handle(async (req: Request) => {
  rateLimit(req, "track", 240, 60_000);
  const body = schema.parse(await req.json());
  const c = await getCampaignById(body.campaignId);
  if (!c || c.status !== "published") return ok({ ok: false });
  const names = c.config.collectNames && body.names ? body.names : undefined;
  await run("INSERT INTO events (campaign_id,type,visitor_id,device,source,meta,created_at) VALUES (?,?,?,?,?,?,?)", [
    c.id,
    body.type,
    body.visitorId,
    device(req.headers.get("user-agent") || ""),
    (body.source || "").toLowerCase(),
    names ? JSON.stringify({ names }) : null,
    Date.now(),
  ]);
  return ok();
});

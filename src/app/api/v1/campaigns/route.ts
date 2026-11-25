import { ok } from "@/lib/api";
import { apiKeyUser, CORS, v1 } from "@/lib/apikeys";
import { listCampaigns } from "@/lib/campaigns";
import { getStats } from "@/lib/stats";
import { appUrl } from "@/lib/url";

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });

/** GET /api/v1/campaigns — all campaigns of the key owner with headline numbers. */
export const GET = v1(async (req: Request) => {
  const u = await apiKeyUser(req);
  const cs = await listCampaigns(u.id);
  const s = await getStats(cs.map((c) => c.id), 1);
  const base = await appUrl();
  return ok({
      data: cs.map((c) => ({
        id: c.id, slug: c.slug, title: c.title, type: c.type, status: c.status,
        url: `${base}/f/${c.slug}`, embed_url: `${base}/embed/${c.slug}`,
        created_at: new Date(c.created_at).toISOString(), updated_at: new Date(c.updated_at).toISOString(),
        totals: s.perCampaign[c.id] || {},
      })),
    });
});

import { ok, HttpError } from "@/lib/api";
import { apiKeyUser, CORS, v1 } from "@/lib/apikeys";
import { getCampaignById, getCampaignBySlug } from "@/lib/campaigns";
import { getStats } from "@/lib/stats";
import { appUrl } from "@/lib/url";

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });

/** GET /api/v1/campaigns/:id?days=30 — campaign + full statistics. */
export const GET = v1(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await apiKeyUser(req);
  const idOrSlug = (await params).id;
  const camp = (await getCampaignById(idOrSlug)) ?? (await getCampaignBySlug(idOrSlug));
  if (!camp || camp.owner_id !== u.id) throw new HttpError(404, "Không tìm thấy chiến dịch");
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const s = await getStats([camp.id], days);
  const base = await appUrl();
  return ok({
      id: camp.id, slug: camp.slug, title: camp.title, type: camp.type, status: camp.status,
      url: `${base}/f/${camp.slug}`, embed_url: `${base}/embed/${camp.slug}`,
      stats: {
        visitors: s.visitors, creators: s.creators, conversion: Number(s.conversion.toFixed(4)),
        totals: s.totals, daily: s.daily, devices: s.devices, sources: s.sources, downloads_by_hour: s.hours,
      },
    });
});

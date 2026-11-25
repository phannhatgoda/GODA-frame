import type { Metadata } from "next";
import { findVerifiedDomain } from "@/lib/domains";
import { campaignMetadata, loadCampaign, renderCampaign } from "@/lib/guestPage";

type P = { params: Promise<{ host: string; path?: string[] }> };

/**
 * Custom domains. Middleware rewrites `frame.congty.vn/<path>` → `/site/frame.congty.vn/<path>`.
 *  - `/`       → the campaign mapped to this domain
 *  - `/<slug>` → any campaign of the same owner
 */
async function resolve({ params }: P) {
  const { host, path } = await params;
  const d = await findVerifiedDomain(decodeURIComponent(host));
  if (!d) return null;
  const slug = path?.[0];
  if (slug) return loadCampaign({ slug, ownerId: d.owner_id });
  if (d.campaign_id) return loadCampaign({ id: d.campaign_id, ownerId: d.owner_id });
  return null;
}

export async function generateMetadata(p: P): Promise<Metadata> {
  return campaignMetadata((await resolve(p))?.c);
}

export default async function Page(p: P) {
  const d = await resolve(p);
  if (d && !d.perms.customDomain) return renderCampaign(null);
  return renderCampaign(d);
}

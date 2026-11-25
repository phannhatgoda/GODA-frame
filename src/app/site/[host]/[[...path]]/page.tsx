import type { Metadata } from "next";
import { findVerifiedDomain } from "@/lib/domains";
import { campaignMetadata, loadCampaign, renderCampaign } from "@/lib/guestPage";
import { loadPortal, Portal, portalMetadata } from "@/lib/portal";

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

async function portalFor({ params }: P) {
  const { host, path } = await params;
  if (path?.length) return null;
  const d = await findVerifiedDomain(decodeURIComponent(host));
  return d && !d.campaign_id ? loadPortal(d.owner_id, "domain") : null;
}

export async function generateMetadata(p: P): Promise<Metadata> {
  const portal = await portalFor(p);
  if (portal) return portalMetadata(portal.site, portal.owner.id);
  const d = await resolve(p);
  return campaignMetadata(d?.c, d?.brand);
}

export default async function Page(p: P) {
  const portal = await portalFor(p);
  if (portal) return <Portal site={portal.site} campaigns={portal.campaigns} />;
  const d = await resolve(p);
  if (d && !d.perms.customDomain) return renderCampaign(null);
  return renderCampaign(d);
}

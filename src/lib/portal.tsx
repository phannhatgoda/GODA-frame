import "server-only";
import type { Metadata } from "next";
import { all, one } from "./db";
import { featuresFor } from "./plans";
import { getUserSite } from "./site";
import { defaultPortal, type SiteSettings } from "./siteTypes";
import { HomeView, type PortalCampaign } from "@/components/home/HomeView";
import { SiteProvider } from "@/components/ui";

export async function loadPortal(ownerId: string, linkBase: "domain" | "app") {
  const owner = await one<{ id: string; name: string; org_name: string | null; role: string; plan: string; features: string; status: string }>(
    "SELECT id, name, org_name, role, plan, features, status FROM users WHERE id = ?", [ownerId],
  );
  if (!owner || owner.status !== "active") return null;
  const perms = await featuresFor(owner);
  if (!perms.whiteLabel) return null;
  const site = (await getUserSite(owner.id)) ?? defaultPortal(owner.org_name || owner.name);
  const rows = await all<{ slug: string; title: string; type: string; updated_at: number }>(
    "SELECT slug, title, type, updated_at FROM campaigns WHERE owner_id = ? AND status = 'published' ORDER BY updated_at DESC LIMIT 60", [owner.id],
  );
  const campaigns: PortalCampaign[] = rows.map((r) => ({
    slug: r.slug, title: r.title, type: r.type,
    href: linkBase === "domain" ? `/${r.slug}` : `/f/${r.slug}`,
    image: `/api/og/${r.slug}?v=${r.updated_at}`,
  }));
  return { owner, perms, site, campaigns };
}

export function brandVars(s: SiteSettings) {
  return {
    "--color-brand": s.brand.primary,
    "--color-brand-600": `color-mix(in oklab, ${s.brand.primary} 86%, black)`,
    "--color-brand-50": `color-mix(in oklab, ${s.brand.primary} 8%, white)`,
    "--color-ink": s.brand.ink,
  } as React.CSSProperties;
}

export function portalMetadata(site: SiteSettings, ownerId: string): Metadata {
  const img = site.seo.ogImage || `/api/og/brand-${ownerId}`;
  return {
    title: { absolute: site.seo.title || site.brand.name },
    description: site.seo.description,
    icons: site.brand.iconUrl ? { icon: site.brand.iconUrl, apple: site.brand.iconUrl } : undefined,
    openGraph: { siteName: site.brand.name, title: site.seo.title || site.brand.name, description: site.seo.description, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export function Portal({ site, campaigns }: { site: SiteSettings; campaigns: PortalCampaign[] }) {
  return (
    <div style={brandVars(site)} className="bg-canvas">
      <SiteProvider value={{ name: site.brand.name, logoUrl: site.brand.logoUrl }}>
        <HomeView site={site} loggedIn={false} scope="portal" campaigns={campaigns} />
      </SiteProvider>
    </div>
  );
}

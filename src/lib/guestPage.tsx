import "server-only";
import type { Metadata } from "next";
import { getCampaignById, getCampaignBySlug } from "./campaigns";
import { one } from "./db";
import { featuresFor } from "./plans";
import { getUser, isAdmin } from "./auth";
import { GuestView } from "@/components/guest/GuestView";
import type { Features } from "./features";
import type { Variant } from "./types";
import { activeBrand } from "./site";
import type { SiteSettings } from "./siteTypes";

type Campaign = NonNullable<Awaited<ReturnType<typeof getCampaignBySlug>>>;

export async function loadCampaign(by: { slug?: string; id?: string; ownerId?: string }) {
  const c = by.id ? await getCampaignById(by.id) : by.slug ? await getCampaignBySlug(by.slug) : null;
  if (!c || (by.ownerId && c.owner_id !== by.ownerId)) return null;
  const owner = await one<{ plan: string; role: string; features: string; status: string }>("SELECT plan, role, features, status FROM users WHERE id = ?", [c.owner_id]);
  if (!owner) return null;
  const perms = await featuresFor(owner);
  return { c, owner, perms, brand: await activeBrand({ id: c.owner_id }, perms) };
}

export function shareImageFor(c: Campaign) {
  const t = c.theme;
  if (t.shareImage === "custom" && t.shareImageUrl) return { url: t.shareImageUrl };
  if (t.shareImage === "cover" && t.coverUrl) return { url: t.coverUrl };
  if (t.shareImage === "frame" && c.config.frameUrl) return { url: c.config.frameUrl, width: c.config.width, height: c.config.height };
  // auto: composed 1200×630 card (frame + headline), cache-busted on every edit
  return { url: `/api/og/${c.slug}?v=${c.updated_at}`, width: 1200, height: 630 };
}

export function campaignMetadata(c: Campaign | undefined, brand?: SiteSettings | null): Metadata {
  if (!c) return { title: "Không tìm thấy" };
  const img = shareImageFor(c);
  const title = c.theme.headline || c.title;
  return {
    title: { absolute: title },
    description: c.theme.subheadline,
    openGraph: { title, description: c.theme.subheadline, type: "website", images: [{ ...img, alt: title }], ...(brand ? { siteName: brand.brand.name } : {}) },
    ...(brand?.brand.iconUrl ? { icons: { icon: brand.brand.iconUrl, apple: brand.brand.iconUrl } } : {}),
    twitter: { card: "summary_large_image", title, description: c.theme.subheadline, images: [img.url] },
  };
}

const defaultLabel = (type: string) => (type === "invitation" ? "Thiệp mời" : "Frame avatar");

function allowedFor(perms: Features, ai: { face: boolean; background: boolean; filters: boolean; caption: boolean }) {
  return { face: perms.aiFace && ai.face, background: perms.aiBackground && ai.background, filters: ai.filters, caption: perms.aiCaption && ai.caption };
}

/** The campaign itself + its companion campaigns (same owner), each shown as a tab. */
export async function buildVariants(c: Campaign, perms: Features, includeDrafts: boolean): Promise<Variant[]> {
  const list: Variant[] = [
    { id: c.id, slug: c.slug, title: c.title, type: c.type, label: c.theme.tabLabel || defaultLabel(c.type), config: c.config, allowed: allowedFor(perms, c.config.ai) },
  ];
  for (const comp of c.theme.companions || []) {
    if (comp.campaignId === c.id || list.some((v) => v.id === comp.campaignId)) continue;
    const o = await getCampaignById(comp.campaignId);
    if (!o || o.owner_id !== c.owner_id || (!includeDrafts && o.status !== "published")) continue;
    list.push({ id: o.id, slug: o.slug, title: o.title, type: o.type, label: comp.label || o.theme.tabLabel || defaultLabel(o.type), config: o.config, allowed: allowedFor(perms, o.config.ai) });
  }
  return list;
}

function Closed({ title = "Trang chưa mở hoặc đã kết thúc", text = "Vui lòng liên hệ ban tổ chức để nhận đường link mới." }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
      <div>
        <div className="text-5xl">🌙</div>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-ink-3">{text}</p>
      </div>
    </div>
  );
}

export async function renderCampaign(d: Awaited<ReturnType<typeof loadCampaign>>, opts: { embed?: boolean } = {}) {
  if (!d) return <Closed title="Không tìm thấy trang" text="Đường link không đúng hoặc đã bị xoá." />;
  const { c, owner, perms } = d;
  if (opts.embed && !perms.embed) return <Closed title="Chưa bật tính năng nhúng" text="Tài khoản của ban tổ chức chưa được mở tính năng nhúng vào website." />;
  const viewer = opts.embed ? null : await getUser();
  const canPreview = !!viewer && (viewer.id === c.owner_id || isAdmin(viewer));
  const live = c.status === "published" && owner.status === "active";
  if (!live && !canPreview) return <Closed />;

  const variants = await buildVariants(c, perms, !live);
  const { owner_id: _o, created_at: _c, updated_at: _u, ...pub } = c;
  return (
    <>
      {!live && (
        <div className="pointer-events-none fixed left-1/2 top-2 z-[60] -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-amber-950 shadow-lg">
          Bản xem trước — chưa xuất bản
        </div>
      )}
      <GuestView campaign={pub} variants={variants} poweredBy={c.theme.showPoweredBy || !perms.removeBranding} preview={!live} embed={opts.embed} canCustomCss={perms.premiumTemplates} />
    </>
  );
}

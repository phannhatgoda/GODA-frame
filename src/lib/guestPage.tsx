import "server-only";
import type { Metadata } from "next";
import { getCampaignById, getCampaignBySlug } from "./campaigns";
import { one } from "./db";
import { featuresFor } from "./plans";
import { getUser, isAdmin } from "./auth";
import { GuestView } from "@/components/guest/GuestView";

type Campaign = NonNullable<Awaited<ReturnType<typeof getCampaignBySlug>>>;

export async function loadCampaign(by: { slug?: string; id?: string; ownerId?: string }) {
  const c = by.id ? await getCampaignById(by.id) : by.slug ? await getCampaignBySlug(by.slug) : null;
  if (!c || (by.ownerId && c.owner_id !== by.ownerId)) return null;
  const owner = await one<{ plan: string; role: string; features: string; status: string }>("SELECT plan, role, features, status FROM users WHERE id = ?", [c.owner_id]);
  if (!owner) return null;
  return { c, owner, perms: await featuresFor(owner) };
}

export function campaignMetadata(c: Campaign | undefined): Metadata {
  if (!c) return { title: "Không tìm thấy" };
  return {
    title: { absolute: c.theme.headline || c.title },
    description: c.theme.subheadline,
    openGraph: { title: c.theme.headline || c.title, description: c.theme.subheadline, images: c.theme.coverUrl ? [c.theme.coverUrl] : c.config.frameUrl.startsWith("/api/") ? [c.config.frameUrl] : [] },
  };
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

  const allowed = {
    face: perms.aiFace && c.config.ai.face,
    background: perms.aiBackground && c.config.ai.background,
    filters: c.config.ai.filters,
    caption: perms.aiCaption && c.config.ai.caption,
  };
  const { owner_id: _o, created_at: _c, updated_at: _u, ...pub } = c;
  return (
    <>
      {!live && (
        <div className="pointer-events-none fixed left-1/2 top-2 z-[60] -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-amber-950 shadow-lg">
          Bản xem trước — chưa xuất bản
        </div>
      )}
      <GuestView campaign={pub} allowed={allowed} poweredBy={c.theme.showPoweredBy || !perms.removeBranding} preview={!live} embed={opts.embed} />
    </>
  );
}

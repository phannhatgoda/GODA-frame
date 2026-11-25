import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCampaignBySlug } from "@/lib/campaigns";
import { one } from "@/lib/db";
import { featuresFor } from "@/lib/plans";
import { getUser, isAdmin } from "@/lib/auth";
import { GuestView } from "@/components/guest/GuestView";

type P = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const c = await getCampaignBySlug(slug);
  if (!c) return null;
  const owner = await one<{ plan: string; role: string; features: string; status: string }>("SELECT plan, role, features, status FROM users WHERE id = ?", [c.owner_id]);
  if (!owner) return null;
  const perms = await featuresFor(owner);
  return { c, owner, perms };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await load((await params).slug);
  if (!d) return { title: "Không tìm thấy" };
  const { c } = d;
  return {
    title: { absolute: c.theme.headline || c.title },
    description: c.theme.subheadline,
    openGraph: { title: c.theme.headline || c.title, description: c.theme.subheadline, images: c.theme.coverUrl ? [c.theme.coverUrl] : c.config.frameUrl.startsWith("/api/") ? [c.config.frameUrl] : [] },
  };
}

export default async function Page({ params }: P) {
  const d = await load((await params).slug);
  if (!d) notFound();
  const { c, owner, perms } = d;
  const viewer = await getUser();
  const canPreview = viewer && (viewer.id === c.owner_id || isAdmin(viewer));
  const live = c.status === "published" && owner.status === "active";

  if (!live && !canPreview) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
        <div>
          <div className="text-5xl">🌙</div>
          <h1 className="mt-4 text-2xl font-bold">Trang chưa mở hoặc đã kết thúc</h1>
          <p className="mt-2 text-ink-3">Vui lòng liên hệ ban tổ chức để nhận đường link mới.</p>
        </div>
      </div>
    );
  }

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
      <GuestView campaign={pub} allowed={allowed} poweredBy={c.theme.showPoweredBy || !perms.removeBranding} preview={!live} />
    </>
  );
}

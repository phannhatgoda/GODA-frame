import { notFound, redirect } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { getCampaignById } from "@/lib/campaigns";
import { PreviewClient } from "@/components/guest/PreviewClient";
import { buildVariants } from "@/lib/guestPage";

export const metadata = { title: "Xem trước", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) redirect("/login");
  const c = await getCampaignById((await params).id);
  if (!c) notFound();
  if (c.owner_id !== u.id && !isAdmin(u)) notFound();
  const { owner_id: _o, created_at: _c, updated_at: _u, ...pub } = c;
  const variants = await buildVariants(c, u.perms, true);
  return <PreviewClient initial={pub} variants={variants} perms={{ face: u.perms.aiFace, background: u.perms.aiBackground, caption: u.perms.aiCaption, removeBranding: u.perms.removeBranding, customCss: u.perms.premiumTemplates }} />;
}

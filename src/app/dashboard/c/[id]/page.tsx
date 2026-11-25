import { notFound } from "next/navigation";
import { requireUser, isAdmin } from "@/lib/auth";
import { getCampaignById } from "@/lib/campaigns";
import { CampaignEditor } from "@/components/editor/CampaignEditor";
import { appUrl } from "@/lib/url";
import { all } from "@/lib/db";

export const metadata = { title: "Thiết kế chiến dịch" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const c = await getCampaignById((await params).id);
  if (!c || (c.owner_id !== u.id && !isAdmin(u))) notFound();
  const { owner_id: _o, created_at: _c, updated_at: _u, ...pub } = c;
  const others = await all<{ id: string; title: string; type: string; status: string }>("SELECT id, title, type, status FROM campaigns WHERE owner_id = ? AND id <> ? ORDER BY updated_at DESC", [c.owner_id, c.id]);
  return <CampaignEditor initial={pub} perms={u.perms} appUrl={await appUrl()} others={others} />;
}

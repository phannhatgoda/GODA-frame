import { notFound } from "next/navigation";
import { requireUser, isAdmin } from "@/lib/auth";
import { getCampaignById } from "@/lib/campaigns";
import { CampaignEditor } from "@/components/editor/CampaignEditor";
import { appUrl } from "@/lib/url";

export const metadata = { title: "Thiết kế chiến dịch" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const c = await getCampaignById((await params).id);
  if (!c || (c.owner_id !== u.id && !isAdmin(u))) notFound();
  const { owner_id: _o, created_at: _c, updated_at: _u, ...pub } = c;
  return <CampaignEditor initial={pub} perms={u.perms} appUrl={await appUrl()} />;
}

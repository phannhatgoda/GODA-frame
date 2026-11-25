import { PageHeader } from "@/components/Shell";
import { CampaignCard } from "@/components/CampaignCard";
import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { listCampaigns } from "@/lib/campaigns";
import { getStats } from "@/lib/stats";

export const metadata = { title: "Tất cả chiến dịch" };

export default async function Page() {
  await requireAdmin();
  const [campaigns, owners] = await Promise.all([listCampaigns(null), all<{ id: string; name: string }>("SELECT id, name FROM users")]);
  const s = await getStats(null, 1);
  const names = new Map(owners.map((o) => [o.id, o.name]));
  return (
    <>
      <PageHeader title="Tất cả chiến dịch" desc={`${campaigns.length} chiến dịch trên toàn hệ thống`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} c={c} owner={names.get(c.owner_id)} views={s.perCampaign[c.id]?.view || 0} downloads={s.perCampaign[c.id]?.download || 0} />
        ))}
      </div>
      {campaigns.length === 0 && <p className="py-16 text-center text-ink-3">Chưa có chiến dịch nào.</p>}
    </>
  );
}

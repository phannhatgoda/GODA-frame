import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { CampaignCard } from "@/components/CampaignCard";
import { Stat, TrendChart } from "@/components/charts";
import { requireUser } from "@/lib/auth";
import { listCampaigns } from "@/lib/campaigns";
import { getStats } from "@/lib/stats";

export const metadata = { title: "Tổng quan" };

export default async function Page() {
  const u = await requireUser();
  const campaigns = await listCampaigns(u.id);
  const stats = await getStats(campaigns.map((c) => c.id), 30);
  const live = campaigns.filter((c) => c.status === "published").length;

  return (
    <>
      <PageHeader
        title={`Xin chào, ${u.name.split(" ").pop()} 👋`}
        desc={`${campaigns.length}/${u.perms.maxCampaigns} chiến dịch · ${live} đang chạy`}
        actions={
          <Link href="/dashboard/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white shadow-[0_6px_16px_-6px_rgb(255_90_31/.6)]">
            <Plus className="size-4" /> Tạo chiến dịch
          </Link>
        }
      />

      {campaigns.length === 0 ? (
        <div className="animate-in rounded-3xl border border-dashed border-line bg-white p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand"><Sparkles className="size-6" /></div>
          <h2 className="mt-4 text-xl font-semibold">Bắt đầu chiến dịch đầu tiên</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-3">Tải frame avatar hoặc thiệp mời lên, chọn giao diện và gửi link cho mọi người. Mất khoảng 5 phút.</p>
          <Link href="/dashboard/new" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-white"><Plus className="size-4" /> Tạo ngay</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Khách truy cập" value={stats.visitors} sub="Người dùng duy nhất" />
            <Stat label="Ảnh đã tạo" value={stats.totals.download} accent sub={`${stats.creators.toLocaleString("vi-VN")} người tạo`} />
            <Stat label="Tỉ lệ chuyển đổi" value={`${(stats.conversion * 100).toFixed(1)}%`} sub="Người tạo / truy cập" />
            <Stat label="Lượt dùng AI" value={stats.totals.ai_face + stats.totals.ai_bg + stats.totals.caption} sub="Căn mặt, tách nền, caption" />
          </div>
          <div className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="mb-2 font-semibold">30 ngày gần nhất</div>
            <TrendChart data={stats.daily} />
          </div>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Chiến dịch của bạn</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} c={c} views={stats.perCampaign[c.id]?.view || 0} downloads={stats.perCampaign[c.id]?.download || 0} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

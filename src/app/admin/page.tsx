import Link from "next/link";
import { PageHeader } from "@/components/Shell";
import { BarList, Stat, TrendChart } from "@/components/charts";
import { requireAdmin } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { getStats } from "@/lib/stats";

export const metadata = { title: "Quản trị" };

export default async function Page() {
  await requireAdmin();
  const since7 = Date.now() - 7 * 86400_000;
  const [s, users, newUsers, camps, live, storage, plans, top] = await Promise.all([
    getStats(null, 30),
    one<{ c: number }>("SELECT COUNT(*) AS c FROM users"),
    one<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE created_at >= ?", [since7]),
    one<{ c: number }>("SELECT COUNT(*) AS c FROM campaigns"),
    one<{ c: number }>("SELECT COUNT(*) AS c FROM campaigns WHERE status='published'"),
    one<{ s: number }>("SELECT COALESCE(SUM(size),0) AS s FROM assets"),
    all<{ label: string; value: number }>("SELECT plan AS label, COUNT(*) AS value FROM users WHERE role='user' GROUP BY plan ORDER BY 2 DESC"),
    all<{ id: string; title: string; slug: string; owner: string; d: number }>(
      `SELECT c.id, c.title, c.slug, u.name AS owner, COUNT(e.id) AS d FROM campaigns c JOIN users u ON u.id = c.owner_id
       LEFT JOIN events e ON e.campaign_id = c.id AND e.type='download' GROUP BY c.id, u.name ORDER BY d DESC LIMIT 8`,
    ),
  ]);
  return (
    <>
      <PageHeader title="Tổng quan hệ thống" desc="Toàn bộ dữ liệu trên nền tảng GODA.Frame" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Người dùng" value={Number(users?.c || 0)} sub={`+${Number(newUsers?.c || 0)} trong 7 ngày`} />
        <Stat label="Chiến dịch" value={Number(camps?.c || 0)} sub={`${Number(live?.c || 0)} đang chạy`} />
        <Stat label="Ảnh đã tạo" value={s.totals.download} accent sub={`${s.visitors.toLocaleString("vi-VN")} khách truy cập`} />
        <Stat label="Lưu trữ" value={`${(Number(storage?.s || 0) / 1024 / 1024).toFixed(1)} MB`} sub={`Chuyển đổi ${(s.conversion * 100).toFixed(1)}%`} />
      </div>
      <div className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="mb-2 font-semibold">Hoạt động 30 ngày</div>
        <TrendChart data={s.daily} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft lg:col-span-2">
          <div className="mb-3 font-semibold">Chiến dịch nổi bật</div>
          <div className="divide-y divide-line">
            {top.length === 0 && <p className="py-6 text-center text-sm text-ink-3">Chưa có chiến dịch</p>}
            {top.map((t, i) => (
              <Link key={t.id} href={`/dashboard/c/${t.id}/stats`} className="flex items-center gap-3 py-2.5 text-sm hover:bg-stone-50">
                <span className="w-5 text-center font-bold text-ink-3">{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.title}</span><span className="text-xs text-ink-3">{t.owner} · /f/{t.slug}</span></span>
                <b className="tabular-nums">{Number(t.d).toLocaleString("vi-VN")}</b>
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft"><div className="mb-3 font-semibold">Phân bổ gói</div><BarList items={plans.map((p) => ({ label: p.label.toUpperCase(), value: Number(p.value) }))} /></div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft"><div className="mb-3 font-semibold">Thiết bị khách</div><BarList items={s.devices} /></div>
        </div>
      </div>
    </>
  );
}

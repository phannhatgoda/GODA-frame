import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Lock, PenLine } from "lucide-react";
import { requireUser, isAdmin } from "@/lib/auth";
import { getCampaignById } from "@/lib/campaigns";
import { getStats, recentNames } from "@/lib/stats";
import { BarList, HourBars, Stat, TrendChart } from "@/components/charts";
import { statusBadge } from "@/components/CampaignCard";

export const metadata = { title: "Thống kê" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const c = await getCampaignById((await params).id);
  if (!c || (c.owner_id !== u.id && !isAdmin(u))) notFound();
  const [s, names] = await Promise.all([getStats([c.id], 30), recentNames(c.id, 100)]);
  const t = s.totals;
  const funnel = [
    { label: "Truy cập trang", value: s.visitors },
    { label: "Tải ảnh lên", value: t.upload },
    { label: "Tải thành phẩm về", value: t.download },
    { label: "Chia sẻ", value: t.share },
  ];
  const fmax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3 animate-in">
        <Link href="/dashboard" className="rounded-lg p-2 hover:bg-black/5"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{c.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-ink-3">{statusBadge(c.status)} /f/{c.slug}</div>
        </div>
        <Link href={`/dashboard/c/${c.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium shadow-soft"><PenLine className="size-4" /> Chỉnh sửa</Link>
        {u.perms.exportCsv ? (
          <a href={`/api/campaigns/${c.id}/export`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-white"><Download className="size-4" /> Xuất CSV</a>
        ) : (
          <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm text-ink-3" title="Nâng cấp gói để xuất dữ liệu"><Lock className="size-4" /> Xuất CSV</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Khách truy cập" value={s.visitors} sub={`${t.view.toLocaleString("vi-VN")} lượt xem`} />
        <Stat label="Ảnh đã tạo" value={t.download} accent sub={`${s.creators.toLocaleString("vi-VN")} người tạo`} />
        <Stat label="Tỉ lệ chuyển đổi" value={`${(s.conversion * 100).toFixed(1)}%`} sub="Người tạo / truy cập" />
        <Stat label="Lượt chia sẻ" value={t.share} sub={`${t.caption} lần dùng AI caption`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft lg:col-span-2">
          <div className="mb-2 font-semibold">30 ngày gần nhất</div>
          <TrendChart data={s.daily} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 font-semibold">Phễu chuyển đổi</div>
          <ul className="space-y-3">
            {funnel.map((f, i) => (
              <li key={f.label}>
                <div className="mb-1 flex justify-between text-[13px]"><span className="text-ink-2">{f.label}</span><b className="tabular-nums">{f.value.toLocaleString("vi-VN")}</b></div>
                <div className="h-7 rounded-lg bg-stone-100">
                  <div className="h-7 rounded-lg" style={{ width: `${Math.max(2, (f.value / fmax) * 100)}%`, background: "#F2622B", opacity: 1 - i * 0.18 }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 font-semibold">Nguồn truy cập</div>
          <BarList items={s.sources} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 font-semibold">Thiết bị</div>
          <BarList items={s.devices} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 font-semibold">Giờ tạo ảnh nhiều nhất</div>
          <HourBars hours={s.hours} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 font-semibold">Mức độ dùng AI</div>
          <BarList items={[{ label: "Căn khuôn mặt", value: t.ai_face }, { label: "Tách / thay nền", value: t.ai_bg }, { label: "Viết caption", value: t.caption }]} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between font-semibold">
            <span>Khách đã tạo gần đây</span>
            <span className="text-xs font-normal text-ink-3">{c.config.collectNames ? `${names.length} tên gần nhất` : "Chưa bật ghi nhận tên"}</span>
          </div>
          {names.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{c.config.collectNames ? "Chưa có khách nhập tên." : "Bật “Ghi nhận tên khách” trong tab Frame để xem danh sách."}</p>
          ) : (
            <div className="max-h-72 divide-y divide-line overflow-y-auto">
              {names.map((n, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{n.name}</span>
                  <span className="text-xs text-ink-3">{n.device} · {new Date(n.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

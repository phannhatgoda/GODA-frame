import { PageHeader } from "@/components/Shell";
import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";

export const metadata = { title: "Nhật ký" };

const LABEL: Record<string, string> = {
  "user.register": "Đăng ký tài khoản", "campaign.create": "Tạo chiến dịch", "campaign.published": "Xuất bản chiến dịch",
  "campaign.draft": "Tạm dừng chiến dịch", "campaign.archived": "Lưu trữ chiến dịch", "campaign.delete": "Xoá chiến dịch",
  "admin.user.update": "Cập nhật người dùng", "admin.user.delete": "Xoá người dùng", "admin.user.create": "Tạo tài khoản",
  "admin.plan.create": "Tạo gói", "admin.plan.update": "Sửa gói", "admin.plan.delete": "Xoá gói", "domain.add": "Thêm tên miền", "domain.verify": "Xác minh tên miền", "domain.delete": "Xoá tên miền", "apikey.create": "Tạo API key", "apikey.delete": "Thu hồi API key",
};

export default async function Page() {
  await requireAdmin();
  const logs = await all<{ id: number; action: string; target: string; detail: string; created_at: number; actor: string | null }>(
    "SELECT l.*, u.email AS actor FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_id ORDER BY l.id DESC LIMIT 300",
  );
  return (
    <>
      <PageHeader title="Nhật ký hoạt động" desc="300 thao tác gần nhất trên hệ thống" />
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        {logs.length === 0 && <p className="py-10 text-center text-sm text-ink-3">Chưa có hoạt động</p>}
        {logs.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span className="w-36 shrink-0 text-xs tabular-nums text-ink-3">{new Date(Number(l.created_at)).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span>
            <span className="font-medium">{LABEL[l.action] || l.action}</span>
            <span className="text-ink-3">{l.actor || "—"}</span>
            {l.detail && <code className="max-w-full truncate rounded bg-stone-100 px-1.5 py-0.5 text-xs text-ink-2">{l.detail}</code>}
          </div>
        ))}
      </div>
    </>
  );
}

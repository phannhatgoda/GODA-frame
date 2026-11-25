import { PageHeader } from "@/components/Shell";
import { PlansManager } from "@/components/admin/PlansManager";
import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { getPlans } from "@/lib/plans";

export const metadata = { title: "Gói dịch vụ" };

export default async function Page() {
  const me = await requireAdmin();
  const [plans, counts] = await Promise.all([getPlans(true), all<{ plan: string; n: number }>("SELECT plan, COUNT(*) AS n FROM users WHERE role='user' GROUP BY plan")]);
  const m = new Map(counts.map((c) => [c.plan, Number(c.n)]));
  return (
    <>
      <PageHeader title="Gói dịch vụ" desc={me.role === "superadmin" ? "Tự tạo gói và tick chọn chức năng. Thay đổi áp dụng ngay cho mọi người dùng thuộc gói." : "Chỉ Super Admin được chỉnh sửa gói."} />
      <PlansManager plans={plans.map((p) => ({ ...p, users: m.get(p.id) || 0 }))} canEdit={me.role === "superadmin"} />
    </>
  );
}

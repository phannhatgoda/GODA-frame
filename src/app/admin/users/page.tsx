import { PageHeader } from "@/components/Shell";
import { UsersTable } from "@/components/admin/UsersTable";
import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { getPlans } from "@/lib/plans";

export const metadata = { title: "Người dùng" };

export default async function Page() {
  const me = await requireAdmin();
  const plans = await getPlans(true);
  const users = await all<{ id: string; email: string; name: string; org_name: string | null; role: string; status: string; plan: string; features: string; created_at: number; last_login_at: number | null; camps: number; downloads: number; storage: number }>(
    `SELECT u.id, u.email, u.name, u.org_name, u.role, u.status, u.plan, u.features, u.created_at, u.last_login_at,
      (SELECT COUNT(*) FROM campaigns c WHERE c.owner_id = u.id) AS camps,
      (SELECT COUNT(*) FROM events e JOIN campaigns c ON c.id = e.campaign_id WHERE c.owner_id = u.id AND e.type='download') AS downloads,
      (SELECT COALESCE(SUM(size),0) FROM assets a WHERE a.owner_id = u.id) AS storage
     FROM users u ORDER BY u.created_at DESC`,
  );
  return (
    <>
      <PageHeader title="Người dùng & phân quyền" desc={`${users.length} tài khoản · Phân gói, bật/tắt tính năng, khoá tài khoản`} />
      <UsersTable users={users.map((u) => ({ ...u, camps: Number(u.camps), downloads: Number(u.downloads), storage: Number(u.storage), created_at: Number(u.created_at), last_login_at: u.last_login_at ? Number(u.last_login_at) : null }))} me={{ id: me.id, role: me.role }} plans={plans.map((p) => ({ id: p.id, name: p.name, features: p.features, is_default: p.is_default }))} />
    </>
  );
}

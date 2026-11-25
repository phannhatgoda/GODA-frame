import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { AccountForm } from "@/components/AccountForm";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { FEATURE_META, type Features } from "@/lib/features";
import { getPlans } from "@/lib/plans";

export const metadata = { title: "Tài khoản" };

export default async function Page() {
  const u = await requireUser();
  const [used, count] = await Promise.all([
    one<{ s: number }>("SELECT COALESCE(SUM(size),0) AS s FROM assets WHERE owner_id = ?", [u.id]),
    one<{ c: number }>("SELECT COUNT(*) AS c FROM campaigns WHERE owner_id = ?", [u.id]),
  ]);
  const mb = Number(used?.s || 0) / 1024 / 1024;
  const plans = await getPlans();
  const plan = plans.find((p) => p.id === u.plan) ?? { name: u.plan };
  return (
    <>
      <PageHeader title="Tài khoản" desc={u.email} />
      <AccountForm name={u.name} orgName={u.org_name || ""} />
      <section className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm text-ink-3">Gói hiện tại</div>
            <div className="text-2xl font-bold">{u.role !== "user" ? "Quản trị viên" : plan.name}</div>
          </div>
          <p className="text-sm text-ink-3">Cần thêm tính năng? Liên hệ GODA.MEDIA để được nâng cấp.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Usage label="Chiến dịch" used={Number(count?.c || 0)} max={u.perms.maxCampaigns} unit="" />
          <Usage label="Dung lượng" used={+mb.toFixed(1)} max={u.perms.maxStorageMB} unit="MB" />
        </div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {(Object.keys(FEATURE_META) as (keyof Features)[]).filter((k) => FEATURE_META[k].kind === "bool").map((k) => (
            <li key={k} className="flex items-center gap-2 text-sm">
              {u.perms[k] ? <Check className="size-4 text-ok" /> : <X className="size-4 text-stone-300" />}
              <span className={u.perms[k] ? "" : "text-ink-3"}>{FEATURE_META[k].label}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Usage({ label, used, max, unit }: { label: string; used: number; max: number; unit: string }) {
  const pct = Math.min(100, (used / Math.max(1, max)) * 100);
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm"><span className="text-ink-2">{label}</span><span className="tabular-nums"><b>{used}</b>{unit} / {max}{unit}</span></div>
      <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

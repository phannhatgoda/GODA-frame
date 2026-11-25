import { PageHeader } from "@/components/Shell";
import { DomainsManager } from "@/components/integrations/DomainsManager";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { APEX_A_RECORD, CNAME_TARGET, TXT_PREFIX } from "@/lib/domains";

export const metadata = { title: "Tên miền riêng" };

export default async function Page() {
  const u = await requireUser();
  const [domains, campaigns] = await Promise.all([
    all<{ id: string; hostname: string; campaign_id: string | null; verify_token: string; verified_at: number | null }>("SELECT id, hostname, campaign_id, verify_token, verified_at FROM domains WHERE owner_id = ? ORDER BY created_at DESC", [u.id]),
    all<{ id: string; title: string; slug: string }>("SELECT id, title, slug FROM campaigns WHERE owner_id = ? ORDER BY updated_at DESC", [u.id]),
  ]);
  return (
    <>
      <PageHeader title="Tên miền riêng" desc="Chạy trang frame trên tên miền của doanh nghiệp bạn" />
      <DomainsManager domains={domains} campaigns={campaigns} allowed={u.perms.customDomain} max={u.perms.maxDomains} target={CNAME_TARGET} apexA={APEX_A_RECORD} txtPrefix={TXT_PREFIX} />
    </>
  );
}

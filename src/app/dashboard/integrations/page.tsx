import { PageHeader } from "@/components/Shell";
import { IntegrationsHub } from "@/components/integrations/IntegrationsHub";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { appUrl } from "@/lib/url";

export const metadata = { title: "Tích hợp" };

export default async function Page() {
  const u = await requireUser();
  const [campaigns, keys] = await Promise.all([
    all<{ id: string; slug: string; title: string; status: string }>("SELECT id, slug, title, status FROM campaigns WHERE owner_id = ? ORDER BY updated_at DESC", [u.id]),
    all<{ id: string; name: string; prefix: string; created_at: number; last_used_at: number | null }>("SELECT id, name, prefix, created_at, last_used_at FROM api_keys WHERE owner_id = ? ORDER BY created_at DESC", [u.id]),
  ]);
  return (
    <>
      <PageHeader title="Tích hợp" desc="Nhúng trình tạo ảnh vào website của bạn và kết nối dữ liệu qua API" />
      <IntegrationsHub base={await appUrl()} campaigns={campaigns} keys={keys} canEmbed={u.perms.embed} canApi={u.perms.api} />
    </>
  );
}

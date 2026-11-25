import { Lock } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { SiteEditor } from "@/components/admin/SiteEditor";
import { requireUser } from "@/lib/auth";
import { getUserSite } from "@/lib/site";
import { defaultPortal } from "@/lib/siteTypes";
import { appUrl } from "@/lib/url";

export const metadata = { title: "Thương hiệu" };

export default async function Page() {
  const u = await requireUser();
  if (!u.perms.whiteLabel)
    return (
      <>
        <PageHeader title="Thương hiệu riêng" desc="Logo, màu sắc, favicon, ảnh chia sẻ & trang chủ mang thương hiệu của bạn" />
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <Lock className="mx-auto size-8 text-ink-3" />
          <h2 className="mt-3 text-lg font-semibold">Gói hiện tại chưa có tính năng Thương hiệu riêng</h2>
          <p className="mx-auto mt-1 max-w-lg text-ink-3">Tự đặt logo, màu chủ đạo, favicon, ảnh thumbnail khi chia sẻ và có trang chủ riêng liệt kê các chiến dịch — chạy trên tên miền của bạn. Liên hệ GODA.MEDIA để nâng cấp.</p>
        </div>
      </>
    );
  const defaults = defaultPortal(u.org_name || u.name);
  return (
    <SiteEditor
      initial={(await getUserSite(u.id, true)) ?? defaults}
      defaults={defaults}
      scope="portal"
      endpoint="/api/brand"
      previewSrc="/brand-preview"
      ogPreview={`/api/og/brand-${u.id}`}
      title="Thương hiệu của tôi"
      publicUrl={`${await appUrl()}/p/${u.id}`}
    />
  );
}

import { redirect } from "next/navigation";
import { SiteEditor } from "@/components/admin/SiteEditor";
import { requireAdmin } from "@/lib/auth";
import { getSite } from "@/lib/site";
import { DEFAULT_SITE } from "@/lib/siteTypes";

export const metadata = { title: "Giao diện hệ thống" };

export default async function Page() {
  const u = await requireAdmin();
  if (u.role !== "superadmin") redirect("/admin");
  return <SiteEditor initial={await getSite(true)} defaults={DEFAULT_SITE} scope="platform" endpoint="/api/admin/site" previewSrc="/site-preview" ogPreview="/api/og/site" title="Giao diện hệ thống" />;
}

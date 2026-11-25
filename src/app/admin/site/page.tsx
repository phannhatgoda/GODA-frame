import { redirect } from "next/navigation";
import { SiteEditor } from "@/components/admin/SiteEditor";
import { requireAdmin } from "@/lib/auth";
import { getSite } from "@/lib/site";

export const metadata = { title: "Giao diện hệ thống" };

export default async function Page() {
  const u = await requireAdmin();
  if (u.role !== "superadmin") redirect("/admin");
  return <SiteEditor initial={await getSite(true)} />;
}

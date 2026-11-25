import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { loadPortal } from "@/lib/portal";
import { SitePreviewClient } from "@/components/home/SitePreviewClient";

export const metadata = { robots: { index: false } };

export default async function Page() {
  const u = await getUser();
  if (!u || !u.perms.whiteLabel) notFound();
  const d = await loadPortal(u.id, "app");
  if (!d) notFound();
  return <SitePreviewClient initial={d.site} scope="portal" campaigns={d.campaigns} />;
}

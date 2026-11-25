import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getSite } from "@/lib/site";
import { SitePreviewClient } from "@/components/home/SitePreviewClient";

export const metadata = { robots: { index: false } };

/** Live homepage preview for the Super Admin's site editor (receives drafts via postMessage). */
export default async function Page() {
  const u = await getUser();
  if (!u || u.role !== "superadmin") notFound();
  return <SitePreviewClient initial={await getSite(true)} />;
}

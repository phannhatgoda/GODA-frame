import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPortal, Portal, portalMetadata } from "@/lib/portal";

type P = { params: Promise<{ uid: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await loadPortal((await params).uid, "app");
  return d ? portalMetadata(d.site, d.owner.id) : { title: "Không tìm thấy" };
}

/** Public brand portal of a customer (plans with "Thương hiệu riêng"). */
export default async function Page({ params }: P) {
  const d = await loadPortal((await params).uid, "app");
  if (!d) notFound();
  return <Portal site={d.site} campaigns={d.campaigns} />;
}

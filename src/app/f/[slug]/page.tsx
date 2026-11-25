import type { Metadata } from "next";
import { campaignMetadata, loadCampaign, renderCampaign } from "@/lib/guestPage";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await loadCampaign({ slug: (await params).slug });
  return campaignMetadata(d?.c, d?.brand);
}

export default async function Page({ params }: P) {
  return renderCampaign(await loadCampaign({ slug: (await params).slug }));
}

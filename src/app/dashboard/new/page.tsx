import { PageHeader } from "@/components/Shell";
import { NewCampaign } from "@/components/NewCampaign";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Tạo chiến dịch" };

export default async function Page() {
  const u = await requireUser();
  return (
    <>
      <PageHeader title="Tạo chiến dịch mới" desc="Ba bước đơn giản — mọi thứ đều chỉnh lại được sau." />
      <NewCampaign canInvite={u.perms.invitation} premium={u.perms.premiumTemplates} />
    </>
  );
}

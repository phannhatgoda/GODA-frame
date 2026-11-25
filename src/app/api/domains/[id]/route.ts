import { z } from "zod";
import { one, run, audit } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { vercelRemoveDomain, type DomainRow } from "@/lib/domains";

type Ctx = { params: Promise<{ id: string }> };

async function owned(id: string) {
  const u = await apiUser();
  const d = await one<DomainRow>("SELECT * FROM domains WHERE id = ?", [id]);
  if (!d || (d.owner_id !== u.id && !isAdmin(u))) throw new HttpError(404, "Không tìm thấy tên miền");
  return { u, d };
}

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const { u, d } = await owned((await params).id);
  const { campaignId } = z.object({ campaignId: z.string().max(40).nullable() }).parse(await req.json());
  if (campaignId && !(await one("SELECT id FROM campaigns WHERE id = ? AND owner_id = ?", [campaignId, d.owner_id])))
    throw new HttpError(400, "Chiến dịch không hợp lệ");
  await run("UPDATE domains SET campaign_id = ? WHERE id = ?", [campaignId, d.id]);
  await audit(u.id, "domain.map", d.id, { campaignId });
  return ok();
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { u, d } = await owned((await params).id);
  await run("DELETE FROM domains WHERE id = ?", [d.id]);
  await vercelRemoveDomain(d.hostname);
  await audit(u.id, "domain.delete", d.id, { host: d.hostname });
  return ok();
});

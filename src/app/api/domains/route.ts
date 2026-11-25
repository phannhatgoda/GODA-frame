import { z } from "zod";
import { nanoid } from "nanoid";
import { all, one, run, audit } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { isReservedHost, normalizeHost, type DomainRow } from "@/lib/domains";

export const GET = handle(async () => {
  const u = await apiUser();
  return ok(await all<DomainRow>("SELECT * FROM domains WHERE owner_id = ? ORDER BY created_at DESC", [u.id]));
});

const schema = z.object({ hostname: z.string().max(260), campaignId: z.string().max(40).nullable().optional() });

export const POST = handle(async (req: Request) => {
  const u = await apiUser();
  if (!u.perms.customDomain) throw new HttpError(403, "Gói hiện tại chưa có tính năng Tên miền riêng");
  const b = schema.parse(await req.json());
  const host = normalizeHost(b.hostname);
  if (!host) throw new HttpError(400, "Tên miền không hợp lệ (VD: frame.congty.vn)");
  if (isReservedHost(host)) throw new HttpError(400, "Không thể dùng tên miền này");
  const count = await one<{ n: number }>("SELECT COUNT(*) AS n FROM domains WHERE owner_id = ?", [u.id]);
  if (Number(count?.n) >= u.perms.maxDomains) throw new HttpError(403, `Gói hiện tại cho phép tối đa ${u.perms.maxDomains} tên miền`);
  if (await one("SELECT id FROM domains WHERE hostname = ?", [host])) throw new HttpError(409, "Tên miền đã được đăng ký trên hệ thống");
  if (b.campaignId && !(await one("SELECT id FROM campaigns WHERE id = ? AND owner_id = ?", [b.campaignId, u.id])))
    throw new HttpError(400, "Chiến dịch không hợp lệ");
  const id = nanoid(12);
  await run("INSERT INTO domains (id, owner_id, hostname, campaign_id, verify_token, created_at) VALUES (?,?,?,?,?,?)", [
    id, u.id, host, b.campaignId || null, `goda-${nanoid(24)}`, Date.now(),
  ]);
  await audit(u.id, "domain.add", id, { host });
  return ok({ id }, 201);
});

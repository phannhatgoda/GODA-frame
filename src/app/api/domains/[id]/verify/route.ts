import { one, run, audit } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { checkDns, vercelAddDomain, vercelAutomation, vercelDomainStatus, type DomainRow } from "@/lib/domains";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  rateLimit(req, "domain-verify", 20, 60_000);
  const u = await apiUser();
  const d = await one<DomainRow>("SELECT * FROM domains WHERE id = ?", [(await params).id]);
  if (!d || (d.owner_id !== u.id && !isAdmin(u))) throw new HttpError(404, "Không tìm thấy tên miền");

  let dns;
  try {
    dns = await checkDns(d);
  } catch {
    throw new HttpError(503, "Không kiểm tra được DNS lúc này, thử lại sau ít phút");
  }
  let vercel: { ok: boolean; message?: string } = { ok: false, message: "manual" };
  if (dns.txtOk) {
    if (!d.verified_at) {
      await run("UPDATE domains SET verified_at = ? WHERE id = ?", [Date.now(), d.id]);
      await audit(u.id, "domain.verify", d.id, { host: d.hostname });
    }
    vercel = await vercelAddDomain(d.hostname);
  }
  const platform = vercel.ok ? await vercelDomainStatus(d.hostname) : null;
  return ok({ ...dns, verified: dns.txtOk, vercel, automation: vercelAutomation(), platform });
});

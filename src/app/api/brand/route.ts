import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { audit } from "@/lib/db";
import { getUserSite, saveUserSite } from "@/lib/site";
import { defaultPortal, siteSchema } from "@/lib/siteTypes";

/** A customer's own branding & portal homepage (plans with "Thương hiệu riêng"). */
export const GET = handle(async () => {
  const u = await apiUser();
  if (!u.perms.whiteLabel) throw new HttpError(403, "Gói hiện tại chưa có tính năng Thương hiệu riêng");
  return ok((await getUserSite(u.id, true)) ?? defaultPortal(u.org_name || u.name));
});

export const PUT = handle(async (req: Request) => {
  const u = await apiUser();
  if (!u.perms.whiteLabel) throw new HttpError(403, "Gói hiện tại chưa có tính năng Thương hiệu riêng");
  const v = siteSchema.parse(await req.json());
  await saveUserSite(u.id, v);
  await audit(u.id, "brand.update");
  return ok();
});

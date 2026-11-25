import { apiAdmin, handle, ok, HttpError } from "@/lib/api";
import { audit } from "@/lib/db";
import { getSite, saveSite } from "@/lib/site";
import { siteSchema } from "@/lib/siteTypes";
import { revalidatePath } from "next/cache";

export const GET = handle(async () => {
  await apiAdmin();
  return ok(await getSite(true));
});

export const PUT = handle(async (req: Request) => {
  const a = await apiAdmin();
  if (a.role !== "superadmin") throw new HttpError(403, "Chỉ Super Admin được sửa giao diện hệ thống");
  const v = siteSchema.parse(await req.json());
  await saveSite(v);
  await audit(a.id, "admin.site.update");
  revalidatePath("/", "layout");
  return ok();
});

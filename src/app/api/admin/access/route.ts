import { z } from "zod";
import { apiAdmin, handle, ok, HttpError } from "@/lib/api";
import { audit } from "@/lib/db";
import { saveAccess } from "@/lib/site";

const schema = z.object({ allowSignup: z.boolean(), message: z.string().trim().max(300) });

export const PUT = handle(async (req: Request) => {
  const a = await apiAdmin();
  if (a.role !== "superadmin") throw new HttpError(403, "Chỉ Super Admin được thay đổi");
  const v = schema.parse(await req.json());
  await saveAccess(v);
  await audit(a.id, v.allowSignup ? "admin.signup.open" : "admin.signup.close");
  return ok();
});

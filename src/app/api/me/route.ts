import { z } from "zod";
import { one, run } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  orgName: z.string().trim().max(120).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự").max(128).optional(),
});

export const PATCH = handle(async (req: Request) => {
  const user = await apiUser();
  const b = schema.parse(await req.json());
  if (b.newPassword) {
    const row = await one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
    if (!row || !(await verifyPassword(b.currentPassword || "", row.password_hash))) throw new HttpError(400, "Mật khẩu hiện tại không đúng");
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(b.newPassword), user.id]);
  }
  await run("UPDATE users SET name = ?, org_name = ? WHERE id = ?", [b.name ?? user.name, b.orgName ?? user.org_name, user.id]);
  return ok();
});

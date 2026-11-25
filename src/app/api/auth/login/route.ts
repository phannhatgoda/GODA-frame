import { z } from "zod";
import { one } from "@/lib/db";
import { createSession, verifyPassword, type DbUser } from "@/lib/auth";
import { handle, ok, HttpError } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Email không hợp lệ"), password: z.string().min(1) });

export const POST = handle(async (req: Request) => {
  rateLimit(req, "login", 15, 60_000);
  const { email, password } = schema.parse(await req.json());
  const u = await one<DbUser>("SELECT * FROM users WHERE email = ?", [email]);
  if (!u || !(await verifyPassword(password, u.password_hash))) throw new HttpError(401, "Email hoặc mật khẩu không đúng");
  if (u.status !== "active") throw new HttpError(403, "Tài khoản đang bị tạm khoá. Liên hệ quản trị viên.");
  await createSession(u.id);
  return ok({ ok: true, redirect: u.role === "user" ? "/dashboard" : "/admin" });
});

import { z } from "zod";
import { nanoid } from "nanoid";
import { one, run, audit } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { handle, ok, HttpError } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập họ tên").max(80),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ").max(120),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
  orgName: z.string().trim().max(120).optional().default(""),
});

export const POST = handle(async (req: Request) => {
  rateLimit(req, "register", 10, 60_000);
  const body = schema.parse(await req.json());
  if (await one("SELECT id FROM users WHERE email = ?", [body.email])) throw new HttpError(409, "Email đã được sử dụng");

  const count = await one<{ c: number }>("SELECT COUNT(*) c FROM users");
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const isSuper = adminEmail ? adminEmail === body.email : Number(count?.c || 0) === 0;

  const id = nanoid(12);
  await run(
    "INSERT INTO users (id,email,name,org_name,password_hash,role,status,plan,features,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [id, body.email, body.name, body.orgName || null, await hashPassword(body.password), isSuper ? "superadmin" : "user", "active", isSuper ? "business" : "free", "{}", Date.now()],
  );
  await audit(id, "user.register", id);
  await createSession(id);
  return ok({ ok: true, redirect: isSuper ? "/admin" : "/dashboard" });
});

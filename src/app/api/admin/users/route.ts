import { z } from "zod";
import { nanoid } from "nanoid";
import { one, run, audit } from "@/lib/db";
import { apiAdmin, handle, ok, HttpError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { getPlans } from "@/lib/plans";

const schema = z.object({
  name: z.string().trim().min(2, "Nhập họ tên").max(80),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tạm tối thiểu 8 ký tự").max(128),
  orgName: z.string().trim().max(120).optional().default(""),
  role: z.enum(["superadmin", "admin", "user"]).default("user"),
  plan: z.string().max(60).optional(),
});

/** Admin creates an account directly (e.g. a client, or a co-owner Super Admin). */
export const POST = handle(async (req: Request) => {
  const actor = await apiAdmin();
  const b = schema.parse(await req.json());
  if (b.role !== "user" && actor.role !== "superadmin") throw new HttpError(403, "Chỉ Super Admin được tạo tài khoản quản trị");
  if (await one("SELECT id FROM users WHERE email = ?", [b.email])) throw new HttpError(409, "Email đã tồn tại");
  const plans = await getPlans();
  const plan = plans.find((p) => p.id === b.plan)?.id ?? (plans.find((p) => p.is_default) ?? plans[0]).id;
  const id = nanoid(12);
  await run(
    "INSERT INTO users (id,email,name,org_name,password_hash,role,status,plan,features,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [id, b.email, b.name, b.orgName || null, await hashPassword(b.password), b.role, "active", plan, "{}", Date.now()],
  );
  await audit(actor.id, "admin.user.create", id, { email: b.email, role: b.role, plan });
  return ok({ id }, 201);
});

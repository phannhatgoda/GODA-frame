import { z } from "zod";
import { one, run, audit } from "@/lib/db";
import { apiAdmin, handle, ok, HttpError } from "@/lib/api";
import type { DbUser } from "@/lib/auth";
import { featureSchema } from "@/lib/featureSchema";
import { getPlans } from "@/lib/plans";

const schema = z.object({
  role: z.enum(["superadmin", "admin", "user"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  plan: z.string().max(60).optional(),
  features: featureSchema.partial().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const actor = await apiAdmin();
  const id = (await params).id;
  const target = await one<DbUser>("SELECT * FROM users WHERE id = ?", [id]);
  if (!target) throw new HttpError(404, "Không tìm thấy người dùng");
  const b = schema.parse(await req.json());

  if (target.role === "superadmin" && actor.role !== "superadmin") throw new HttpError(403, "Chỉ Super Admin mới sửa được tài khoản này");
  if (b.role && b.role !== target.role && actor.role !== "superadmin") throw new HttpError(403, "Chỉ Super Admin được phân quyền");
  if (target.id === actor.id && ((b.role && b.role !== actor.role) || b.status === "suspended"))
    throw new HttpError(400, "Không thể tự hạ quyền hoặc khoá chính mình");

  if (b.plan && !(await getPlans()).some((p) => p.id === b.plan)) throw new HttpError(400, "Gói không tồn tại");
  // never leave the platform without an active Super Admin
  const losingSuper = target.role === "superadmin" && ((b.role && b.role !== "superadmin") || b.status === "suspended");
  if (losingSuper) {
    const others = await one<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role='superadmin' AND status='active' AND id <> ?", [id]);
    if (!Number(others?.n)) throw new HttpError(400, "Hệ thống cần ít nhất 1 Super Admin đang hoạt động");
  }

  await run("UPDATE users SET role=?, status=?, plan=?, features=? WHERE id=?", [
    b.role ?? target.role,
    b.status ?? target.status,
    b.plan ?? target.plan,
    b.features ? JSON.stringify(b.features) : target.features,
    id,
  ]);
  await audit(actor.id, "admin.user.update", id, b);
  return ok();
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const actor = await apiAdmin();
  if (actor.role !== "superadmin") throw new HttpError(403, "Chỉ Super Admin được xoá tài khoản");
  const id = (await params).id;
  if (id === actor.id) throw new HttpError(400, "Không thể xoá chính mình");
  await run("DELETE FROM events WHERE campaign_id IN (SELECT id FROM campaigns WHERE owner_id = ?)", [id]);
  await run("DELETE FROM campaigns WHERE owner_id = ?", [id]);
  await run("DELETE FROM assets WHERE owner_id = ?", [id]);
  await run("DELETE FROM users WHERE id = ?", [id]);
  await audit(actor.id, "admin.user.delete", id);
  return ok();
});

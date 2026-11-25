import { one, run, audit } from "@/lib/db";
import { apiAdmin, handle, ok, HttpError } from "@/lib/api";
import { invalidatePlans } from "@/lib/plans";
import { planSchema } from "@/lib/featureSchema";

type Ctx = { params: Promise<{ id: string }> };

async function superOnly() {
  const a = await apiAdmin();
  if (a.role !== "superadmin") throw new HttpError(403, "Chỉ Super Admin được sửa gói");
  return a;
}

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const actor = await superOnly();
  const id = (await params).id;
  if (!(await one("SELECT id FROM plans WHERE id = ?", [id]))) throw new HttpError(404, "Không tìm thấy gói");
  const b = planSchema.parse(await req.json());
  if (b.is_default) await run("UPDATE plans SET is_default = FALSE WHERE id <> ?", [id]);
  else if (!(await one("SELECT id FROM plans WHERE is_default AND id <> ?", [id])))
    throw new HttpError(400, "Phải có ít nhất 1 gói mặc định cho người đăng ký mới");
  await run("UPDATE plans SET name=?, price=?, description=?, features=?, is_default=? WHERE id=?", [
    b.name, b.price, b.description, JSON.stringify(b.features), b.is_default, id,
  ]);
  invalidatePlans();
  await audit(actor.id, "admin.plan.update", id, { name: b.name });
  return ok();
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const actor = await superOnly();
  const id = (await params).id;
  const p = await one<{ is_default: boolean }>("SELECT is_default FROM plans WHERE id = ?", [id]);
  if (!p) throw new HttpError(404, "Không tìm thấy gói");
  if (p.is_default) throw new HttpError(400, "Không thể xoá gói mặc định — hãy đặt gói khác làm mặc định trước");
  const def = await one<{ id: string }>("SELECT id FROM plans WHERE is_default LIMIT 1");
  const moved = await one<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE plan = ?", [id]);
  await run("UPDATE users SET plan = ? WHERE plan = ?", [def!.id, id]);
  await run("DELETE FROM plans WHERE id = ?", [id]);
  invalidatePlans();
  await audit(actor.id, "admin.plan.delete", id, { movedUsers: Number(moved?.n || 0), to: def!.id });
  return ok({ moved: Number(moved?.n || 0) });
});

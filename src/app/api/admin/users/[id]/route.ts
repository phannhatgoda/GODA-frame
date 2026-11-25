import { z } from "zod";
import { one, run, audit } from "@/lib/db";
import { apiAdmin, handle, ok, HttpError } from "@/lib/api";
import type { DbUser } from "@/lib/auth";

const featureSchema = z
  .object({
    maxCampaigns: z.number().int().min(0).max(100000),
    maxStorageMB: z.number().int().min(0).max(1000000),
    invitation: z.boolean(), aiFace: z.boolean(), aiBackground: z.boolean(), aiCaption: z.boolean(),
    premiumTemplates: z.boolean(), removeBranding: z.boolean(), exportCsv: z.boolean(),
  })
  .partial();

const schema = z.object({
  role: z.enum(["superadmin", "admin", "user"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  plan: z.enum(["free", "pro", "business"]).optional(),
  features: featureSchema.optional(),
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

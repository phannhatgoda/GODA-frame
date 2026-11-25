import { run, audit, one } from "@/lib/db";
import { apiAdmin, handle, ok, HttpError } from "@/lib/api";
import { planSchema } from "@/lib/featureSchema";
import { getPlans, invalidatePlans } from "@/lib/plans";
import { slugify } from "@/lib/slug";

export const GET = handle(async () => {
  await apiAdmin();
  return ok(await getPlans(true));
});

export const POST = handle(async (req: Request) => {
  const actor = await apiAdmin();
  if (actor.role !== "superadmin") throw new HttpError(403, "Chỉ Super Admin được tạo gói");
  const b = planSchema.parse(await req.json());
  let id = slugify(b.name).replace(/-/g, "_") || "plan";
  if (await one("SELECT id FROM plans WHERE id = ?", [id])) id = `${id}_${Date.now().toString(36)}`;
  const max = await one<{ m: number }>("SELECT COALESCE(MAX(sort),0) AS m FROM plans");
  if (b.is_default) await run("UPDATE plans SET is_default = FALSE");
  await run("INSERT INTO plans (id,name,price,description,features,is_default,sort,created_at) VALUES (?,?,?,?,?,?,?,?)", [
    id, b.name, b.price, b.description, JSON.stringify(b.features), b.is_default, Number(max?.m || 0) + 1, Date.now(),
  ]);
  invalidatePlans();
  await audit(actor.id, "admin.plan.create", id, { name: b.name });
  return ok({ id }, 201);
});

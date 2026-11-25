import { z } from "zod";
import { all, one, run, audit } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { isAdmin, type SessionUser } from "@/lib/auth";
import { configSchema, getCampaignById, themeSchema } from "@/lib/campaigns";
import { slugify } from "@/lib/slug";
import { TEMPLATES } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function owned(user: SessionUser, id: string) {
  const c = await getCampaignById(id);
  if (!c) throw new HttpError(404, "Không tìm thấy chiến dịch");
  if (c.owner_id !== user.id && !isAdmin(user)) throw new HttpError(403, "Không có quyền");
  return c;
}

const patch = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  slug: z.string().trim().min(3, "Link tối thiểu 3 ký tự").max(48).optional(),
  theme: themeSchema.optional(),
  config: configSchema.optional(),
});

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await apiUser();
  return ok(await owned(user, (await params).id));
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await apiUser();
  const c = await owned(user, (await params).id);
  const body = patch.parse(await req.json());

  let slug = c.slug;
  if (body.slug !== undefined) {
    slug = slugify(body.slug);
    if (slug.length < 3) throw new HttpError(400, "Link không hợp lệ");
    if (["admin", "api", "login", "dashboard"].includes(slug)) throw new HttpError(400, "Link này đã được hệ thống giữ chỗ");
    const dup = await one("SELECT id FROM campaigns WHERE slug = ? AND id <> ?", [slug, c.id]);
    if (dup) throw new HttpError(409, "Link này đã có người dùng, hãy chọn link khác");
  }

  const theme = body.theme ?? c.theme;
  if (!user.perms.removeBranding) theme.showPoweredBy = true;
  if (body.theme && !user.perms.premiumTemplates && theme.design?.customCss) theme.design.customCss = "";
  if (body.theme?.companions?.length) {
    const ids = [...new Set(theme.companions.map((x) => x.campaignId))].filter((id) => id !== c.id);
    const ok = ids.length
      ? await all<{ id: string }>(`SELECT id FROM campaigns WHERE owner_id = ? AND id IN (${ids.map(() => "?").join(",")})`, [c.owner_id, ...ids])
      : [];
    const allowed = new Set(ok.map((r) => r.id));
    theme.companions = theme.companions.filter((x) => allowed.has(x.campaignId));
  }
  if (!user.perms.premiumTemplates && TEMPLATES[theme.template]?.premium && body.theme)
    throw new HttpError(403, "Giao diện này thuộc gói cao cấp");

  await run("UPDATE campaigns SET title=?, status=?, slug=?, theme=?, config=?, updated_at=? WHERE id=?", [
    body.title ?? c.title,
    body.status ?? c.status,
    slug,
    JSON.stringify(theme),
    JSON.stringify(body.config ?? c.config),
    Date.now(),
    c.id,
  ]);
  if (body.status && body.status !== c.status) await audit(user.id, `campaign.${body.status}`, c.id);
  return ok({ ok: true, slug });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await apiUser();
  const c = await owned(user, (await params).id);
  await run("DELETE FROM events WHERE campaign_id = ?", [c.id]);
  await run("DELETE FROM campaigns WHERE id = ?", [c.id]);
  await audit(user.id, "campaign.delete", c.id, { title: c.title });
  return ok();
});

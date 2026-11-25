import { z } from "zod";
import { nanoid } from "nanoid";
import { one, run, audit } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { defaultConfig, defaultTheme } from "@/lib/types";
import { slugify, withSuffix } from "@/lib/slug";

const schema = z.object({
  type: z.enum(["avatar", "invitation"]),
  title: z.string().trim().min(2, "Tên chiến dịch tối thiểu 2 ký tự").max(100),
  template: z.enum(["aura", "bold", "studio", "paper"]).optional(),
});

export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const body = schema.parse(await req.json());
  const count = await one<{ c: number }>("SELECT COUNT(*) AS c FROM campaigns WHERE owner_id = ?", [user.id]);
  if (Number(count?.c || 0) >= user.perms.maxCampaigns)
    throw new HttpError(403, `Gói hiện tại cho phép tối đa ${user.perms.maxCampaigns} chiến dịch. Liên hệ quản trị để nâng cấp.`);
  if (body.type === "invitation" && !user.perms.invitation) throw new HttpError(403, "Tài khoản chưa được mở tính năng Thiệp mời");

  const theme = defaultTheme(body.type, body.title);
  if (body.template) theme.template = body.template;
  if (!user.perms.premiumTemplates && (theme.template === "studio" || theme.template === "paper")) theme.template = body.template === "bold" ? "bold" : "aura";
  const config = defaultConfig(body.type);

  const id = nanoid(12);
  const now = Date.now();
  await run(
    "INSERT INTO campaigns (id,owner_id,slug,type,title,status,theme,config,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [id, user.id, withSuffix(slugify(body.title)), body.type, body.title, "draft", JSON.stringify(theme), JSON.stringify(config), now, now],
  );
  await audit(user.id, "campaign.create", id);
  return ok({ id }, 201);
});

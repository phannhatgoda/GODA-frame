import "server-only";
import { z } from "zod";
import { all, one } from "./db";
import { defaultConfig, defaultTheme, parseJson, type CampaignPublic, type FrameConfig, type Theme } from "./types";

export interface CampaignRow {
  id: string;
  owner_id: string;
  slug: string;
  type: "avatar" | "invitation";
  title: string;
  status: "draft" | "published" | "archived";
  theme: string;
  config: string;
  created_at: number;
  updated_at: number;
}

export function hydrate(row: CampaignRow): CampaignPublic & { owner_id: string; created_at: number; updated_at: number } {
  const theme = parseJson<Theme>(row.theme, defaultTheme(row.type, row.title));
  const base = defaultConfig(row.type);
  const cfg = parseJson<FrameConfig>(row.config, base);
  cfg.photo = { ...base.photo, ...cfg.photo };
  cfg.ai = { ...base.ai, ...cfg.ai };
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    status: row.status,
    theme,
    config: cfg,
    owner_id: row.owner_id,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

export async function getCampaignById(id: string) {
  const r = await one<CampaignRow>("SELECT * FROM campaigns WHERE id = ?", [id]);
  return r ? hydrate(r) : null;
}

export async function getCampaignBySlug(slug: string) {
  const r = await one<CampaignRow>("SELECT * FROM campaigns WHERE slug = ?", [slug]);
  return r ? hydrate(r) : null;
}

export async function listCampaigns(ownerId: string | null) {
  const rows = ownerId
    ? await all<CampaignRow>("SELECT * FROM campaigns WHERE owner_id = ? ORDER BY updated_at DESC", [ownerId])
    : await all<CampaignRow>("SELECT * FROM campaigns ORDER BY updated_at DESC");
  return rows.map(hydrate);
}

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Màu không hợp lệ");
const url = z
  .string()
  .max(500)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "Đường dẫn không hợp lệ");
const font = z.enum(["be-vietnam", "inter", "montserrat", "playfair", "lora", "dancing"]);

export const themeSchema = z.object({
  template: z.enum(["aura", "bold", "studio", "paper"]),
  primary: color,
  background: color,
  text: color,
  font,
  radius: z.number().min(0).max(40),
  logoUrl: url,
  coverUrl: url,
  headline: z.string().max(140),
  subheadline: z.string().max(400),
  ctaText: z.string().max(40),
  footerText: z.string().max(300),
  links: z.array(z.object({ label: z.string().max(40), url: z.string().max(500).refine((v) => /^(https?:\/\/|mailto:|tel:)/i.test(v), "Link phải bắt đầu bằng https://, mailto: hoặc tel:") })).max(8),
  hashtag: z.string().max(120),
  caption: z.string().max(600),
  showPoweredBy: z.boolean(),
});

const num = z.number().finite();
export const configSchema = z.object({
  frameUrl: url,
  width: z.number().int().min(200).max(4000),
  height: z.number().int().min(200).max(4000),
  photo: z.object({
    enabled: z.boolean(), x: num, y: num, w: num.positive(), h: num.positive(),
    shape: z.enum(["rect", "rounded", "circle"]), layer: z.enum(["below", "above"]),
  }),
  texts: z
    .array(
      z.object({
        id: z.string().max(30), label: z.string().max(60), placeholder: z.string().max(80),
        defaultValue: z.string().max(120), x: num, y: num, maxWidth: num.positive(),
        fontSize: z.number().min(8).max(400), font, color, weight: z.number().min(100).max(900),
        align: z.enum(["left", "center", "right"]), uppercase: z.boolean(), required: z.boolean(),
      }),
    )
    .max(6),
  ai: z.object({ face: z.boolean(), background: z.boolean(), filters: z.boolean(), caption: z.boolean() }),
  bgFill: color,
  collectNames: z.boolean(),
  format: z.enum(["png", "jpg"]),
});

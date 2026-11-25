import { z } from "zod";

const n = z.number().int().min(0).max(1_000_000);
export const featureSchema = z.object({
  maxCampaigns: n, maxStorageMB: n, maxDomains: n,
  invitation: z.boolean(), aiFace: z.boolean(), aiBackground: z.boolean(), aiCaption: z.boolean(),
  premiumTemplates: z.boolean(), removeBranding: z.boolean(), whiteLabel: z.boolean().default(false), exportCsv: z.boolean(),
  customDomain: z.boolean(), embed: z.boolean(), api: z.boolean(),
});

export const planSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên gói").max(40),
  price: z.string().trim().max(40).default(""),
  description: z.string().trim().max(160).default(""),
  features: featureSchema,
  is_default: z.boolean().default(false),
});


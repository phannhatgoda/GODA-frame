export type Role = "superadmin" | "admin" | "user";

export interface Features {
  maxCampaigns: number;
  maxStorageMB: number;
  maxDomains: number;
  invitation: boolean;
  aiFace: boolean;
  aiBackground: boolean;
  aiCaption: boolean;
  premiumTemplates: boolean;
  removeBranding: boolean;
  whiteLabel: boolean;
  exportCsv: boolean;
  customDomain: boolean;
  embed: boolean;
  api: boolean;
}

export type FeatureKey = keyof Features;

export const FEATURE_GROUPS: { title: string; keys: FeatureKey[] }[] = [
  { title: "Hạn mức", keys: ["maxCampaigns", "maxStorageMB", "maxDomains"] },
  { title: "Sản phẩm", keys: ["invitation", "premiumTemplates", "removeBranding", "whiteLabel"] },
  { title: "AI", keys: ["aiFace", "aiBackground", "aiCaption"] },
  { title: "Tích hợp & dữ liệu", keys: ["customDomain", "embed", "api", "exportCsv"] },
];

export const FEATURE_META: Record<FeatureKey, { label: string; hint: string; kind: "number" | "bool" }> = {
  maxCampaigns: { label: "Số chiến dịch tối đa", hint: "Số frame/thiệp được tạo", kind: "number" },
  maxStorageMB: { label: "Dung lượng lưu trữ (MB)", hint: "Frame, logo, ảnh bìa", kind: "number" },
  maxDomains: { label: "Số tên miền riêng", hint: "Áp dụng khi bật Tên miền riêng", kind: "number" },
  invitation: { label: "Thiệp mời", hint: "Tạo thiệp có trường tên khách", kind: "bool" },
  premiumTemplates: { label: "Giao diện cao cấp", hint: "Studio, Paper, Neon", kind: "bool" },
  removeBranding: { label: "Ẩn 'Powered by GODA'", hint: "White-label", kind: "bool" },
  whiteLabel: { label: "Thương hiệu riêng", hint: "Logo, màu, favicon, thumbnail & trang chủ riêng", kind: "bool" },
  aiFace: { label: "AI căn khuôn mặt", hint: "Tự nhận diện & căn mặt vào khung", kind: "bool" },
  aiBackground: { label: "AI tách nền", hint: "Xoá phông, thay nền, xoá phông mờ", kind: "bool" },
  aiCaption: { label: "AI viết caption", hint: "Gợi ý caption đăng social", kind: "bool" },
  customDomain: { label: "Tên miền riêng", hint: "frame.congty.vn qua CNAME", kind: "bool" },
  embed: { label: "Nhúng vào website", hint: "Mã iframe / widget cho landing page", kind: "bool" },
  api: { label: "API & API key", hint: "Lấy số liệu tự động qua REST API", kind: "bool" },
  exportCsv: { label: "Xuất dữ liệu CSV", hint: "Tải thống kê chi tiết", kind: "bool" },
};

export const ALL_FEATURES: Features = {
  maxCampaigns: 9999, maxStorageMB: 100000, maxDomains: 100, invitation: true, aiFace: true, aiBackground: true,
  aiCaption: true, premiumTemplates: true, removeBranding: true, whiteLabel: true, exportCsv: true, customDomain: true, embed: true, api: true,
};

export const NO_FEATURES: Features = {
  maxCampaigns: 0, maxStorageMB: 0, maxDomains: 0, invitation: false, aiFace: false, aiBackground: false,
  aiCaption: false, premiumTemplates: false, removeBranding: false, whiteLabel: false, exportCsv: false, customDomain: false, embed: false, api: false,
};

export interface PlanDef {
  id: string;
  name: string;
  price: string;
  description: string;
  features: Features;
  is_default?: boolean;
  sort?: number;
}

/** Seeded once into the `plans` table; afterwards the Super Admin edits plans in /admin/plans. */
export const DEFAULT_PLANS: PlanDef[] = [
  {
    id: "free", name: "Free", price: "0đ", description: "Dùng thử cho sự kiện nhỏ",
    features: { ...NO_FEATURES, maxCampaigns: 2, maxStorageMB: 50, invitation: true, aiFace: true, embed: true },
  },
  {
    id: "pro", name: "Pro", price: "Liên hệ", description: "Cho phòng truyền thông nội bộ",
    features: { ...ALL_FEATURES, maxCampaigns: 15, maxStorageMB: 500, maxDomains: 1, removeBranding: false, whiteLabel: false, api: false },
  },
  {
    id: "business", name: "Business", price: "Liên hệ", description: "White-label, tên miền & API",
    features: { ...ALL_FEATURES, maxCampaigns: 999, maxStorageMB: 5000, maxDomains: 10 },
  },
];

function parse(raw: unknown): Partial<Features> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Partial<Features>;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

/** plan features (from DB) + per-user overrides. Admins always get everything. */
export function resolveFeatures(
  user: { role: string; features: string | Partial<Features> },
  plan: { features: string | Partial<Features> } | null | undefined,
): Features {
  if (user.role === "superadmin" || user.role === "admin") return { ...ALL_FEATURES };
  return { ...NO_FEATURES, ...parse(plan?.features), ...parse(user.features) };
}

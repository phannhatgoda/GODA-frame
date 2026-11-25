export type Plan = "free" | "pro" | "business";
export type Role = "superadmin" | "admin" | "user";

export interface Features {
  maxCampaigns: number;
  maxStorageMB: number;
  invitation: boolean;
  aiFace: boolean;
  aiBackground: boolean;
  aiCaption: boolean;
  premiumTemplates: boolean;
  removeBranding: boolean;
  exportCsv: boolean;
}

export const FEATURE_META: Record<keyof Features, { label: string; hint: string; kind: "number" | "bool" }> = {
  maxCampaigns: { label: "Số chiến dịch tối đa", hint: "Số frame/thiệp được tạo", kind: "number" },
  maxStorageMB: { label: "Dung lượng lưu trữ (MB)", hint: "Frame, logo, ảnh bìa", kind: "number" },
  invitation: { label: "Thiệp mời", hint: "Tạo thiệp có trường tên khách", kind: "bool" },
  aiFace: { label: "AI căn khuôn mặt", hint: "Tự nhận diện & căn mặt vào khung", kind: "bool" },
  aiBackground: { label: "AI tách nền", hint: "Xoá phông, thay nền, xoá phông mờ", kind: "bool" },
  aiCaption: { label: "AI viết caption", hint: "Gợi ý caption đăng social", kind: "bool" },
  premiumTemplates: { label: "Giao diện cao cấp", hint: "Mẫu Studio, Paper", kind: "bool" },
  removeBranding: { label: "Ẩn 'Powered by GODA'", hint: "White-label", kind: "bool" },
  exportCsv: { label: "Xuất dữ liệu CSV", hint: "Tải thống kê chi tiết", kind: "bool" },
};

export const PLANS: Record<Plan, { name: string; price: string; features: Features }> = {
  free: {
    name: "Free",
    price: "0đ",
    features: {
      maxCampaigns: 2, maxStorageMB: 50, invitation: true, aiFace: true, aiBackground: false,
      aiCaption: false, premiumTemplates: false, removeBranding: false, exportCsv: false,
    },
  },
  pro: {
    name: "Pro",
    price: "Liên hệ",
    features: {
      maxCampaigns: 15, maxStorageMB: 500, invitation: true, aiFace: true, aiBackground: true,
      aiCaption: true, premiumTemplates: true, removeBranding: false, exportCsv: true,
    },
  },
  business: {
    name: "Business",
    price: "Liên hệ",
    features: {
      maxCampaigns: 999, maxStorageMB: 5000, invitation: true, aiFace: true, aiBackground: true,
      aiCaption: true, premiumTemplates: true, removeBranding: true, exportCsv: true,
    },
  },
};

export function effectiveFeatures(user: { plan: string; role: string; features: string | Partial<Features> }): Features {
  if (user.role === "superadmin" || user.role === "admin") return { ...PLANS.business.features };
  const base = PLANS[(user.plan as Plan) in PLANS ? (user.plan as Plan) : "free"].features;
  let overrides: Partial<Features> = {};
  try {
    overrides = typeof user.features === "string" ? JSON.parse(user.features || "{}") : user.features;
  } catch {}
  return { ...base, ...overrides };
}

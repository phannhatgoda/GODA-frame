export type TemplateId = "aura" | "bold" | "glass" | "festive" | "mono" | "studio" | "paper" | "neon";
export type BgStyle = "solid" | "gradient" | "mesh" | "image";
export type FontId = "be-vietnam" | "inter" | "montserrat" | "playfair" | "lora" | "dancing";

export const FONTS: Record<FontId, { label: string; css: string; google: string }> = {
  "be-vietnam": { label: "Be Vietnam Pro", css: "'Be Vietnam Pro', system-ui, sans-serif", google: "Be+Vietnam+Pro:wght@400;500;600;700;800" },
  inter: { label: "Inter", css: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700;800" },
  montserrat: { label: "Montserrat", css: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@400;500;600;700;800" },
  playfair: { label: "Playfair Display", css: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@400;600;700;800" },
  lora: { label: "Lora", css: "'Lora', Georgia, serif", google: "Lora:wght@400;500;600;700" },
  dancing: { label: "Dancing Script", css: "'Dancing Script', cursive", google: "Dancing+Script:wght@500;700" },
};

export const TEMPLATES: Record<TemplateId, { name: string; desc: string; premium: boolean }> = {
  aura: { name: "Aura", desc: "Tối giản, gradient mềm", premium: false },
  bold: { name: "Bold", desc: "Dải màu thương hiệu mạnh", premium: false },
  glass: { name: "Glass", desc: "Kính mờ trên nền rực rỡ", premium: false },
  festive: { name: "Lễ hội", desc: "Đỏ – vàng, hợp Tết & Gala", premium: false },
  mono: { name: "Mono", desc: "Trắng đen, góc vuông, hiện đại", premium: false },
  studio: { name: "Studio", desc: "Nền tối sang trọng", premium: true },
  paper: { name: "Paper", desc: "Thanh lịch kiểu thiệp, chữ serif", premium: true },
  neon: { name: "Neon", desc: "Đêm nhạc, phát sáng", premium: true },
};

/** Recommended starting colours per template — applied when the organizer picks a template. */
export const TEMPLATE_PRESETS: Record<TemplateId, Pick<Theme, "primary" | "secondary" | "background" | "text" | "font" | "bgStyle" | "radius">> = {
  aura: { primary: "#FF5A1F", secondary: "#FFD6E7", background: "#FFF7F2", text: "#17120E", font: "be-vietnam", bgStyle: "mesh", radius: 20 },
  bold: { primary: "#2346FF", secondary: "#00B3A4", background: "#F4F6FF", text: "#0B1233", font: "montserrat", bgStyle: "solid", radius: 16 },
  glass: { primary: "#7C3AED", secondary: "#EC4899", background: "#3B82F6", text: "#FFFFFF", font: "be-vietnam", bgStyle: "gradient", radius: 24 },
  festive: { primary: "#C8102E", secondary: "#F5C542", background: "#7F0A1C", text: "#FFF6E0", font: "playfair", bgStyle: "gradient", radius: 18 },
  mono: { primary: "#111111", secondary: "#E5E5E5", background: "#FFFFFF", text: "#111111", font: "inter", bgStyle: "solid", radius: 0 },
  studio: { primary: "#FF5A1F", secondary: "#7C3AED", background: "#0F0F12", text: "#F5F5F4", font: "be-vietnam", bgStyle: "mesh", radius: 20 },
  paper: { primary: "#B4532A", secondary: "#E9D8BF", background: "#FBF7F0", text: "#2A1A10", font: "playfair", bgStyle: "solid", radius: 10 },
  neon: { primary: "#22D3EE", secondary: "#F0ABFC", background: "#05010D", text: "#F5F3FF", font: "montserrat", bgStyle: "mesh", radius: 18 },
};

export interface ThemeLink { label: string; url: string }

export interface Theme {
  template: TemplateId;
  primary: string;
  secondary: string;
  background: string;
  bgStyle: BgStyle;
  text: string;
  font: FontId;
  radius: number;
  logoUrl: string;
  coverUrl: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  footerText: string;
  links: ThemeLink[];
  hashtag: string;
  caption: string;
  showPoweredBy: boolean;
}

export interface TextField {
  id: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  x: number; // center/anchor X in frame px
  y: number; // baseline-center Y in frame px
  maxWidth: number;
  fontSize: number;
  font: FontId;
  color: string;
  weight: number;
  align: "left" | "center" | "right";
  uppercase: boolean;
  required: boolean;
}

export interface PhotoSlot {
  enabled: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: "rect" | "rounded" | "circle";
  layer: "below" | "above";
}

export interface FrameConfig {
  frameUrl: string;
  width: number;
  height: number;
  photo: PhotoSlot;
  texts: TextField[];
  ai: { face: boolean; background: boolean; filters: boolean; caption: boolean };
  bgFill: string;
  collectNames: boolean;
  format: "png" | "jpg";
}

export interface CampaignPublic {
  id: string;
  slug: string;
  type: "avatar" | "invitation";
  title: string;
  status: string;
  theme: Theme;
  config: FrameConfig;
}

export function defaultTheme(type: "avatar" | "invitation", title: string): Theme {
  const inv = type === "invitation";
  const tpl: TemplateId = inv ? "paper" : "aura";
  return {
    template: tpl,
    ...TEMPLATE_PRESETS[tpl],
    logoUrl: "",
    coverUrl: "",
    headline: title,
    subheadline: inv
      ? "Chạm vào ô tên trên thiệp để nhập, rồi lưu lại hoặc chia sẻ ngay."
      : "Chạm vào khung để thêm ảnh — AI tự căn khuôn mặt. Chỉ 10 giây để có avatar mới.",
    ctaText: inv ? "Tạo thiệp của tôi" : "Thêm ảnh của bạn",
    footerText: "© " + new Date().getFullYear() + " — Thực hiện bởi GODA.MEDIA",
    links: [],
    hashtag: "",
    caption: "",
    showPoweredBy: true,
  };
}

export function defaultConfig(type: "avatar" | "invitation"): FrameConfig {
  if (type === "invitation") {
    return {
      frameUrl: "/samples/invitation-classic.svg",
      width: 1080,
      height: 1350,
      photo: { enabled: false, x: 390, y: 380, w: 300, h: 300, shape: "circle", layer: "above" },
      texts: [
        {
          id: "name", label: "Tên của bạn", placeholder: "VD: Nguyễn Văn An", defaultValue: "",
          x: 540, y: 760, maxWidth: 860, fontSize: 84, font: "dancing", color: "#8A3B1D",
          weight: 700, align: "center", uppercase: false, required: true,
        },
      ],
      ai: { face: true, background: false, filters: false, caption: true },
      bgFill: "#FFFFFF",
      collectNames: true,
      format: "jpg",
    };
  }
  return {
    frameUrl: "/samples/avatar-ring.svg",
    width: 1080,
    height: 1080,
    photo: { enabled: true, x: 0, y: 0, w: 1080, h: 1080, shape: "rect", layer: "below" },
    texts: [],
    ai: { face: true, background: true, filters: true, caption: true },
    bgFill: "#FFF1E8",
    collectNames: false,
    format: "png",
  };
}

export function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export type TemplateId = "aura" | "bold" | "studio" | "paper";
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
  aura: { name: "Aura", desc: "Tối giản, nền gradient mềm, tập trung vào frame", premium: false },
  bold: { name: "Bold", desc: "Ảnh bìa lớn, khối màu thương hiệu mạnh", premium: false },
  studio: { name: "Studio", desc: "Nền tối sang trọng, bố cục 2 cột như app", premium: true },
  paper: { name: "Paper", desc: "Thanh lịch kiểu thiệp, chữ serif, nền kem", premium: true },
};

export interface ThemeLink { label: string; url: string }

export interface Theme {
  template: TemplateId;
  primary: string;
  background: string;
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
  return {
    template: inv ? "paper" : "aura",
    primary: inv ? "#B4532A" : "#FF5A1F",
    background: inv ? "#FBF7F0" : "#FFF7F2",
    text: "#17120E",
    font: inv ? "playfair" : "be-vietnam",
    radius: 20,
    logoUrl: "",
    coverUrl: "",
    headline: title,
    subheadline: inv
      ? "Nhập tên của bạn để nhận thiệp mời riêng, rồi lưu lại hoặc chia sẻ ngay."
      : "Tải ảnh lên, AI tự căn khuôn mặt vào khung. Chỉ 10 giây để có avatar mới.",
    ctaText: inv ? "Tạo thiệp của tôi" : "Chọn ảnh của bạn",
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

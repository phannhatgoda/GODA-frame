import { z } from "zod";

/** Platform-wide branding & homepage content, edited by the Super Admin in /admin/site. */
export const FEATURE_ICONS = ["scan-face", "wand", "shield", "palette", "sparkles", "chart", "globe", "code", "users", "heart", "zap", "camera"] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];

const str = (max: number) => z.string().max(max);
const url = z.string().max(500).refine((v) => v === "" || v.startsWith("/") || /^https:\/\//i.test(v), "Đường dẫn ảnh không hợp lệ");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const base = { id: str(40), visible: z.boolean() };

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("hero"), badge: str(80), title: str(160), highlight: str(60), subtitle: str(400), ctaPrimary: str(40), ctaSecondary: str(40), image: url }),
  z.object({ ...base, type: z.literal("steps"), title: str(120), items: z.array(z.object({ title: str(80), desc: str(240) })).max(6) }),
  z.object({ ...base, type: z.literal("features"), title: str(160), items: z.array(z.object({ icon: z.enum(FEATURE_ICONS), title: str(80), desc: str(240) })).max(12) }),
  z.object({ ...base, type: z.literal("cta"), title: str(160), desc: str(300), button: str(40) }),
  z.object({ ...base, type: z.literal("text"), title: str(160), body: str(2000) }),
]);

export const siteSchema = z.object({
  brand: z.object({ name: str(40).min(1), logoUrl: url, iconUrl: url, primary: color, ink: color }),
  seo: z.object({ title: str(120), description: str(300), ogImage: url }),
  home: z.object({ sections: z.array(sectionSchema).max(20) }),
  footer: str(300),
});

export type SiteSettings = z.infer<typeof siteSchema>;
export type HomeSection = SiteSettings["home"]["sections"][number];
export type SectionType = HomeSection["type"];

export const DEFAULT_SITE: SiteSettings = {
  brand: { name: "GODA.Frame", logoUrl: "", iconUrl: "", primary: "#FF5A1F", ink: "#0C0A09" },
  seo: {
    title: "GODA Frame — Frame avatar & thiệp mời cho doanh nghiệp",
    description: "Tạo trang frame avatar và thiệp mời có thương hiệu riêng trong 5 phút. AI căn mặt, tách nền ngay trên thiết bị. Thống kê lan toả theo thời gian thực.",
    ogImage: "",
  },
  home: {
    sections: [
      {
        id: "hero", type: "hero", visible: true, badge: "Thuộc hệ sinh thái GODA.MEDIA",
        title: "Biến mỗi nhân viên thành đại sứ của sự kiện.", highlight: "đại sứ",
        subtitle: "Tạo trang frame avatar & thiệp mời mang thương hiệu riêng trong 5 phút. Gửi một đường link — CBNV, khách mời tự tạo ảnh với AI và chia sẻ lên mạng xã hội.",
        ctaPrimary: "Tạo chiến dịch đầu tiên", ctaSecondary: "Xem cách hoạt động", image: "",
      },
      {
        id: "how", type: "steps", visible: true, title: "",
        items: [
          { title: "Tải frame lên", desc: "PNG nền trong suốt hoặc thiệp mời. Hệ thống tự phát hiện vùng đặt ảnh." },
          { title: "Tuỳ biến trang", desc: "Chọn giao diện, màu, logo, nội dung. Xem trước trực tiếp trên điện thoại." },
          { title: "Gửi link & đo lường", desc: "Khách tự tạo ảnh. Bạn theo dõi lượt dùng theo thời gian thực." },
        ],
      },
      {
        id: "features", type: "features", visible: true, title: "Đủ thông minh để khách thấy “wow”. Đủ đơn giản để ai cũng dùng được.",
        items: [
          { icon: "scan-face", title: "AI căn khuôn mặt", desc: "Nhận diện mặt và tự căn vào giữa khung. Khách không cần kéo thả." },
          { icon: "wand", title: "AI tách nền", desc: "Xoá phông, thay nền màu thương hiệu hoặc làm mờ hậu cảnh kiểu chân dung." },
          { icon: "shield", title: "Ảnh không rời máy", desc: "Toàn bộ xử lý chạy trên trình duyệt của khách. Không lưu ảnh cá nhân lên máy chủ." },
          { icon: "palette", title: "Thương hiệu của bạn", desc: "9 giao diện mẫu, tự thiết kế màu, font, logo, ảnh nền, footer và liên kết." },
          { icon: "globe", title: "Tên miền riêng & nhúng web", desc: "Chạy trên frame.congty.vn hoặc nhúng thẳng vào landing page." },
          { icon: "chart", title: "Đo lường lan toả", desc: "Lượt xem, lượt tạo, tỉ lệ chuyển đổi, thiết bị, nguồn truy cập theo ngày." },
        ],
      },
      { id: "cta", type: "cta", visible: true, title: "Year End Party, Kick-off, Ngày hội văn hoá, Gala tri ân…", desc: "Mỗi sự kiện nội bộ đều có thể có một “màu áo số” riêng. Bắt đầu miễn phí ngay hôm nay.", button: "Bắt đầu miễn phí" },
    ],
  },
  footer: "© {year} GODA.MEDIA — Truyền thông nội bộ & văn hoá doanh nghiệp",
};

export function newSection(type: SectionType): HomeSection {
  const id = type + "-" + Math.random().toString(36).slice(2, 7);
  switch (type) {
    case "hero": return { ...(DEFAULT_SITE.home.sections[0] as Extract<HomeSection, { type: "hero" }>), id };
    case "steps": return { id, type, visible: true, title: "Quy trình", items: [{ title: "Bước 1", desc: "Mô tả" }, { title: "Bước 2", desc: "Mô tả" }, { title: "Bước 3", desc: "Mô tả" }] };
    case "features": return { id, type, visible: true, title: "Tính năng", items: [{ icon: "sparkles", title: "Tính năng mới", desc: "Mô tả ngắn" }] };
    case "cta": return { id, type, visible: true, title: "Sẵn sàng bắt đầu?", desc: "Tạo chiến dịch đầu tiên chỉ trong 5 phút.", button: "Dùng miễn phí" };
    case "text": return { id, type, visible: true, title: "Tiêu đề", body: "Nội dung…" };
  }
}

export const SECTION_LABEL: Record<SectionType, string> = { hero: "Banner đầu trang", steps: "Các bước", features: "Lưới tính năng", cta: "Khối kêu gọi", text: "Đoạn văn tự do" };

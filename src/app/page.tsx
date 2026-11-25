import Link from "next/link";
import { ArrowRight, BarChart3, Palette, ScanFace, ShieldCheck, Sparkles, Wand2, Link2, Users } from "lucide-react";
import { Logo } from "@/components/ui";
import { getUser } from "@/lib/auth";

const features = [
  { icon: ScanFace, title: "AI căn khuôn mặt", desc: "Nhận diện mặt và tự căn vào giữa khung. Khách không cần kéo thả." },
  { icon: Wand2, title: "AI tách nền", desc: "Xoá phông, thay nền màu thương hiệu hoặc làm mờ hậu cảnh kiểu chân dung." },
  { icon: ShieldCheck, title: "Ảnh không rời máy", desc: "Toàn bộ xử lý chạy trên trình duyệt của khách. Không lưu ảnh cá nhân lên máy chủ." },
  { icon: Palette, title: "Thương hiệu của bạn", desc: "4 giao diện mẫu, tuỳ biến màu, font, logo, ảnh bìa, footer và liên kết." },
  { icon: Sparkles, title: "AI viết caption", desc: "Gợi ý caption kèm hashtag chiến dịch để khách đăng ngay lên social." },
  { icon: BarChart3, title: "Đo lường lan toả", desc: "Lượt xem, lượt tạo, tỉ lệ chuyển đổi, thiết bị, nguồn truy cập theo ngày." },
];

export default async function Home() {
  const user = await getUser();
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white">Vào Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-medium text-ink-2 hover:bg-black/5">Đăng nhập</Link>
                <Link href="/register" className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white">Dùng miễn phí</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-orange-200/70 via-rose-100/60 to-transparent blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="animate-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink-2 shadow-soft">
              <span className="size-1.5 rounded-full bg-brand" /> Thuộc hệ sinh thái GODA.MEDIA
            </span>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Biến mỗi nhân viên thành <span className="bg-gradient-to-r from-brand to-rose-500 bg-clip-text text-transparent">đại sứ</span> của sự kiện.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              Tạo trang frame avatar & thiệp mời mang thương hiệu riêng trong 5 phút. Gửi một đường link — CBNV, khách mời tự tạo ảnh với AI và chia sẻ lên mạng xã hội.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/dashboard/new" : "/register"} className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 font-medium text-white shadow-[0_10px_30px_-10px_rgb(255_90_31/.7)] transition hover:bg-brand-600">
                Tạo chiến dịch đầu tiên <ArrowRight className="size-4" />
              </Link>
              <a href="#how" className="inline-flex h-12 items-center rounded-xl border border-line bg-white px-6 font-medium shadow-soft">Xem cách hoạt động</a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-ink-3">
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-ok" /> Tuân thủ quyền riêng tư</span>
              <span className="flex items-center gap-1.5"><Users className="size-4" /> Không cần cài app</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md animate-pop">
            <div className="absolute -inset-6 -z-10 rounded-[48px] bg-white/60 blur-xl" />
            <div className="rounded-[36px] border border-line bg-white p-3 shadow-lift">
              <div className="rounded-[28px] bg-gradient-to-b from-orange-50 to-rose-50 p-6">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-3"><span>goda.media/f/year-end-2026</span><Link2 className="size-3.5" /></div>
                <div className="relative mx-auto mt-5 aspect-square w-full overflow-hidden rounded-full bg-gradient-to-br from-stone-300 to-stone-500">
                  <div className="absolute inset-x-[22%] bottom-0 top-[18%] rounded-t-full bg-gradient-to-b from-stone-100 to-stone-300" />
                  <div className="absolute left-1/2 top-[22%] size-[34%] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-100 to-amber-200" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/samples/avatar-ring.svg" alt="Frame mẫu" className="absolute inset-0 size-full" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-medium">
                  {["Căn mặt AI", "Tách nền", "Caption AI"].map((t) => (
                    <span key={t} className="rounded-xl bg-white/80 px-2 py-2 shadow-sm">{t}</span>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-ink py-3 text-center text-sm font-semibold text-white">Tải ảnh & chia sẻ</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-3">
          {[
            ["01", "Tải frame lên", "PNG nền trong suốt hoặc thiệp mời. Hệ thống tự phát hiện vùng đặt ảnh."],
            ["02", "Tuỳ biến trang", "Chọn giao diện, màu, logo, nội dung. Xem trước trực tiếp trên điện thoại."],
            ["03", "Gửi link & đo lường", "Khách tự tạo ảnh. Bạn theo dõi lượt dùng theo thời gian thực."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div className="text-sm font-bold text-brand">{n}</div>
              <h3 className="mt-2 text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-ink-3">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Đủ thông minh để khách thấy “wow”. Đủ đơn giản để ai cũng dùng được.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand"><f.icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-3">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-8 py-14 text-white sm:px-14">
          <div className="absolute -right-20 -top-20 size-80 rounded-full bg-brand/40 blur-3xl" />
          <h2 className="relative max-w-xl text-3xl font-bold tracking-tight">Year End Party, Kick-off, Ngày hội văn hoá, Gala tri ân…</h2>
          <p className="relative mt-3 max-w-xl text-white/60">Mỗi sự kiện nội bộ đều có thể có một “màu áo số” riêng. Bắt đầu miễn phí ngay hôm nay.</p>
          <Link href="/register" className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-medium text-ink">
            Bắt đầu miễn phí <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-ink-3">© {new Date().getFullYear()} GODA.MEDIA — Truyền thông nội bộ & văn hoá doanh nghiệp</footer>
    </div>
  );
}

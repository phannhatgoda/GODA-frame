"use client";
import Link from "next/link";
import {
  ArrowRight, BarChart3, Camera, Code2, Globe, Heart, Link2, Palette, ScanFace, ShieldCheck, Sparkles, Users, Wand2, Zap,
} from "lucide-react";
import { cx, Logo } from "@/components/ui";
import type { FeatureIcon, HomeSection, SiteSettings } from "@/lib/siteTypes";

export const ICONS: Record<FeatureIcon, typeof ScanFace> = {
  "scan-face": ScanFace, wand: Wand2, shield: ShieldCheck, palette: Palette, sparkles: Sparkles, chart: BarChart3,
  globe: Globe, code: Code2, users: Users, heart: Heart, zap: Zap, camera: Camera,
};

function Highlight({ text, word }: { text: string; word: string }) {
  if (!word || !text.includes(word)) return <>{text}</>;
  const [a, ...rest] = text.split(word);
  return (
    <>
      {a}
      <span className="bg-gradient-to-r from-brand to-rose-500 bg-clip-text text-transparent">{word}</span>
      {rest.join(word)}
    </>
  );
}

/**
 * Homepage rendered from the Super Admin's settings.
 * `editable` (admin preview iframe): hover outlines + click selects the section in the editor.
 */
export function HomeView({ site, loggedIn, editable, selected }: { site: SiteSettings; loggedIn: boolean; editable?: boolean; selected?: string | null }) {
  const brand = { name: site.brand.name, logoUrl: site.brand.logoUrl };
  const pick = (id: string) => (e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    window.parent?.postMessage({ type: "goda:site-select", id }, location.origin);
  };
  const wrap = (s: HomeSection, children: React.ReactNode, className?: string) => (
    <section
      key={s.id}
      data-section={s.id}
      onClickCapture={editable ? pick(s.id) : undefined}
      className={cx(className, editable && "relative cursor-pointer outline-2 outline-offset-[-2px] transition hover:outline hover:outline-brand/60", editable && selected === s.id && "outline outline-brand")}
    >
      {editable && <span className={cx("pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-brand px-2 py-0.5 text-[11px] font-semibold text-white transition", selected === s.id ? "opacity-100" : "opacity-0")}>Đang sửa</span>}
      {children}
    </section>
  );
  const href = (primary: boolean) => (primary ? (loggedIn ? "/dashboard/new" : "/register") : "#how");

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header
        data-section="__brand"
        onClickCapture={editable ? pick("__brand") : undefined}
        className={cx("sticky top-0 z-30 border-b border-line/60 bg-canvas/80 backdrop-blur-xl", editable && "cursor-pointer hover:outline hover:outline-2 hover:outline-brand/60", editable && selected === "__brand" && "outline outline-2 outline-brand")}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo brand={brand} />
          <nav className="flex items-center gap-2">
            {loggedIn ? (
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

      {site.home.sections.filter((s) => s.visible).map((s) => {
        switch (s.type) {
          case "hero":
            return wrap(
              s,
              <>
                <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand/25 via-rose-100/60 to-transparent blur-3xl" />
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
                  <div className="animate-in">
                    {s.badge && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink-2 shadow-soft">
                        <span className="size-1.5 rounded-full bg-brand" /> {s.badge}
                      </span>
                    )}
                    <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-6xl"><Highlight text={s.title} word={s.highlight} /></h1>
                    {s.subtitle && <p className="mt-5 max-w-xl text-lg text-ink-2">{s.subtitle}</p>}
                    <div className="mt-8 flex flex-wrap gap-3">
                      {s.ctaPrimary && (
                        <Link href={href(true)} className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 font-medium text-white shadow-[0_10px_30px_-10px_var(--color-brand)] transition hover:bg-brand-600">
                          {s.ctaPrimary} <ArrowRight className="size-4" />
                        </Link>
                      )}
                      {s.ctaSecondary && <a href={href(false)} className="inline-flex h-12 items-center rounded-xl border border-line bg-white px-6 font-medium shadow-soft">{s.ctaSecondary}</a>}
                    </div>
                    <div className="mt-8 flex items-center gap-6 text-sm text-ink-3">
                      <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-ok" /> Tuân thủ quyền riêng tư</span>
                      <span className="flex items-center gap-1.5"><Users className="size-4" /> Không cần cài app</span>
                    </div>
                  </div>
                  <div className="relative mx-auto w-full max-w-md animate-pop">
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt="" className="w-full rounded-[36px] border border-line bg-white object-cover shadow-lift" />
                    ) : (
                      <div className="rounded-[36px] border border-line bg-white p-3 shadow-lift">
                        <div className="rounded-[28px] bg-gradient-to-b from-orange-50 to-rose-50 p-6">
                          <div className="flex items-center justify-between text-xs font-semibold text-ink-3"><span>frame.congty.vn/year-end-2026</span><Link2 className="size-3.5" /></div>
                          <div className="relative mx-auto mt-5 aspect-square w-full overflow-hidden rounded-full bg-gradient-to-br from-stone-300 to-stone-500">
                            <div className="absolute inset-x-[22%] bottom-0 top-[18%] rounded-t-full bg-gradient-to-b from-stone-100 to-stone-300" />
                            <div className="absolute left-1/2 top-[22%] size-[34%] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-100 to-amber-200" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/samples/avatar-ring.svg" alt="Frame mẫu" className="absolute inset-0 size-full" />
                          </div>
                          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-medium">
                            {["Căn mặt AI", "Tách nền", "Caption AI"].map((x) => <span key={x} className="rounded-xl bg-white/80 px-2 py-2 shadow-sm">{x}</span>)}
                          </div>
                          <div className="mt-3 rounded-xl bg-ink py-3 text-center text-sm font-semibold text-white">Tải ảnh & chia sẻ</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>,
              "relative",
            );
          case "steps":
            return wrap(
              s,
              <div id={s.id === "how" ? "how" : undefined} className="mx-auto max-w-6xl px-5 py-16">
                {s.title && <h2 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">{s.title}</h2>}
                <div className={cx("grid gap-8", s.items.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
                  {s.items.map((it, i) => (
                    <div key={i}>
                      <div className="text-sm font-bold text-brand">{String(i + 1).padStart(2, "0")}</div>
                      <h3 className="mt-2 text-xl font-semibold">{it.title}</h3>
                      <p className="mt-2 text-ink-3">{it.desc}</p>
                    </div>
                  ))}
                </div>
              </div>,
              "border-y border-line bg-white",
            );
          case "features":
            return wrap(
              s,
              <div className="mx-auto max-w-6xl px-5 py-20">
                {s.title && <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h2>}
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {s.items.map((f, i) => {
                    const I = ICONS[f.icon] ?? Sparkles;
                    return (
                      <div key={i} className="rounded-2xl border border-line bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand"><I className="size-5" /></span>
                        <h3 className="mt-4 font-semibold">{f.title}</h3>
                        <p className="mt-1.5 text-sm text-ink-3">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>,
            );
          case "cta":
            return wrap(
              s,
              <div className="mx-auto max-w-6xl px-5 pb-20">
                <div className="relative overflow-hidden rounded-[32px] bg-ink px-8 py-14 text-white sm:px-14">
                  <div className="absolute -right-20 -top-20 size-80 rounded-full bg-brand/40 blur-3xl" />
                  <h2 className="relative max-w-xl text-3xl font-bold tracking-tight">{s.title}</h2>
                  {s.desc && <p className="relative mt-3 max-w-xl text-white/60">{s.desc}</p>}
                  {s.button && (
                    <Link href={href(true)} className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-medium text-ink">
                      {s.button} <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
              </div>,
            );
          case "text":
            return wrap(
              s,
              <div className="mx-auto max-w-3xl px-5 py-16">
                {s.title && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.title}</h2>}
                <div className="mt-4 whitespace-pre-line text-[17px] leading-relaxed text-ink-2">{s.body}</div>
              </div>,
            );
        }
      })}

      <footer
        data-section="__footer"
        onClickCapture={editable ? pick("__footer") : undefined}
        className={cx("border-t border-line py-8 text-center text-sm text-ink-3", editable && "cursor-pointer hover:outline hover:outline-2 hover:outline-brand/60", editable && selected === "__footer" && "outline outline-2 outline-brand")}
      >
        {site.footer.replace("{year}", String(new Date().getFullYear()))}
      </footer>
    </div>
  );
}

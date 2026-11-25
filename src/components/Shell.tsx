"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Code2, Globe, LayoutGrid, LogOut, Package, Plus, ScrollText, Shield, UserRound, Users, Layers } from "lucide-react";
import { cx, Logo } from "./ui";

const ICONS = { package: Package, globe: Globe, code: Code2, grid: LayoutGrid, plus: Plus, user: UserRound, shield: Shield, users: Users, layers: Layers, chart: BarChart3, log: ScrollText };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

export function Shell({ nav, user, children, area }: { nav: NavItem[]; user: { name: string; email: string; role: string }; children: React.ReactNode; area: "user" | "admin" }) {
  const path = usePathname();
  const router = useRouter();
  const active = (n: NavItem) => (n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/"));
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  const isAdmin = user.role !== "user";
  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white/70 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link href="/" className="px-2"><Logo /></Link>
        {area === "admin" && <div className="mx-2 mt-4 rounded-lg bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">Quản trị hệ thống</div>}
        <nav className="mt-6 flex-1 space-y-1">
          {nav.map((n) => {
            const I = ICONS[n.icon];
            return (
              <Link key={n.href} href={n.href} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active(n) ? "bg-ink text-white" : "text-ink-2 hover:bg-black/5")}>
                <I className="size-[18px]" /> {n.label}
              </Link>
            );
          })}
          {isAdmin && (
            <div className="pt-4">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Chuyển khu vực</div>
              {area === "user" ? (
                <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-black/5"><Shield className="size-[18px]" /> Trang quản trị</Link>
              ) : (
                <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-black/5"><LayoutGrid className="size-[18px]" /> Không gian của tôi</Link>
              )}
            </div>
          )}
        </nav>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-xs text-ink-3">{user.email}</div>
          </div>
          <button onClick={logout} className="rounded-lg p-1.5 text-ink-3 hover:bg-black/5 hover:text-ink" title="Đăng xuất"><LogOut className="size-4" /></button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/"><Logo /></Link>
        <div className="flex items-center gap-1">
          {isAdmin && <Link href={area === "user" ? "/admin" : "/dashboard"} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:bg-black/5">{area === "user" ? "Quản trị" : "Của tôi"}</Link>}
          <button onClick={logout} className="rounded-lg p-2 text-ink-3"><LogOut className="size-4" /></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-line bg-white/90 p-1.5 shadow-lift backdrop-blur-xl lg:hidden">
        {nav.map((n) => {
          const I = ICONS[n.icon];
          return (
            <Link key={n.href} href={n.href} className={cx("flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium", active(n) ? "bg-ink text-white" : "text-ink-3")}>
              <I className="size-5" /> {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-ink-3">{desc}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

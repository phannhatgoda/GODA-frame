import { Shell, type NavItem } from "@/components/Shell";
import { requireUser } from "@/lib/auth";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: "grid", exact: true },
  { href: "/dashboard/new", label: "Tạo mới", icon: "plus" },
  { href: "/dashboard/domains", label: "Tên miền", icon: "globe" },
  { href: "/dashboard/integrations", label: "Tích hợp", icon: "code" },
  { href: "/dashboard/account", label: "Tài khoản", icon: "user" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  return <Shell nav={nav} user={{ name: u.name, email: u.email, role: u.role }} area="user">{children}</Shell>;
}

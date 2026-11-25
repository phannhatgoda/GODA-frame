import { Shell, type NavItem } from "@/components/Shell";
import { requireAdmin } from "@/lib/auth";

const nav: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: "chart", exact: true },
  { href: "/admin/users", label: "Người dùng", icon: "users" },
  { href: "/admin/plans", label: "Gói", icon: "package" },
  { href: "/admin/site", label: "Giao diện", icon: "palette" },
  { href: "/admin/campaigns", label: "Chiến dịch", icon: "layers" },
  { href: "/admin/logs", label: "Nhật ký", icon: "log" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const u = await requireAdmin();
  return <Shell nav={nav} user={{ name: u.name, email: u.email, role: u.role }} area="admin">{children}</Shell>;
}

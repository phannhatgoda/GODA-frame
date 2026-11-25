import { Shell, type NavItem } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { getUserSite } from "@/lib/site";
import { brandVars } from "@/lib/portal";
import { SiteProvider } from "@/components/ui";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: "grid", exact: true },
  { href: "/dashboard/new", label: "Tạo mới", icon: "plus" },
  { href: "/dashboard/domains", label: "Tên miền", icon: "globe" },
  { href: "/dashboard/integrations", label: "Tích hợp", icon: "code" },
  { href: "/dashboard/brand", label: "Thương hiệu", icon: "palette" },
  { href: "/dashboard/account", label: "Tài khoản", icon: "user" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const shell = <Shell nav={nav} user={{ name: u.name, email: u.email, role: u.role }} area="user">{children}</Shell>;
  // white-label: the customer's dashboard wears their own logo & colours
  const brand = u.perms.whiteLabel && u.role === "user" ? await getUserSite(u.id) : null;
  if (!brand) return shell;
  return (
    <div style={brandVars(brand)}>
      <SiteProvider value={{ name: brand.brand.name, logoUrl: brand.brand.logoUrl }}>{shell}</SiteProvider>
    </div>
  );
}

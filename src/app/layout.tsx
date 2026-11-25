import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteProvider, ToastProvider } from "@/components/ui";
import { getSite } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSite();
  const short = s.brand.name;
  return {
    title: { default: s.seo.title || short, template: `%s · ${short}` },
    description: s.seo.description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    openGraph: { siteName: short, title: s.seo.title, description: s.seo.description, images: s.seo.ogImage ? [s.seo.ogImage] : ["/api/og/site"] },
    twitter: { card: "summary_large_image" },
    icons: s.brand.iconUrl ? { icon: s.brand.iconUrl, apple: s.brand.iconUrl } : undefined,
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#fafaf9" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSite();
  // the whole app's accent colour comes from the Super Admin's branding settings
  const brandVars = {
    "--color-brand": s.brand.primary,
    "--color-brand-600": `color-mix(in oklab, ${s.brand.primary} 86%, black)`,
    "--color-brand-50": `color-mix(in oklab, ${s.brand.primary} 8%, white)`,
    "--color-ink": s.brand.ink,
  } as React.CSSProperties;
  return (
    <html lang="vi" style={brandVars}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SiteProvider value={{ name: s.brand.name, logoUrl: s.brand.logoUrl }}>
          <ToastProvider>{children}</ToastProvider>
        </SiteProvider>
      </body>
    </html>
  );
}

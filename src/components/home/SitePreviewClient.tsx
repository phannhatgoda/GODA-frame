"use client";
import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/siteTypes";
import { HomeView, type PortalCampaign } from "./HomeView";

export function SitePreviewClient({ initial, scope = "platform", campaigns = [] }: { initial: SiteSettings; scope?: "platform" | "portal"; campaigns?: PortalCampaign[] }) {
  const [site, setSite] = useState(initial);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      if (e.data?.type === "goda:site-draft") {
        setSite(e.data.site);
        setSel(e.data.selected ?? null);
        const root = document.documentElement;
        root.style.setProperty("--color-brand", e.data.site.brand.primary);
        root.style.setProperty("--color-brand-600", `color-mix(in oklab, ${e.data.site.brand.primary} 86%, black)`);
        root.style.setProperty("--color-brand-50", `color-mix(in oklab, ${e.data.site.brand.primary} 8%, white)`);
        root.style.setProperty("--color-ink", e.data.site.brand.ink);
        if (e.data.scrollTo) document.querySelector(`[data-section="${CSS.escape(e.data.scrollTo)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ type: "goda:site-ready" }, location.origin);
    return () => window.removeEventListener("message", on);
  }, []);
  return <HomeView site={site} loggedIn={false} editable selected={sel} scope={scope} campaigns={campaigns} />;
}

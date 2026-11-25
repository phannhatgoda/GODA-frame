"use client";
import { useEffect, useMemo, useState } from "react";
import type { CampaignPublic, Variant } from "@/lib/types";
import { GuestView } from "./GuestView";

export function PreviewClient({ initial, variants, perms }: { initial: CampaignPublic; variants: Variant[]; perms: { face: boolean; background: boolean; caption: boolean; removeBranding: boolean; customCss: boolean } }) {
  const [c, setC] = useState(initial);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.type !== "goda:preview") return;
      setC((prev) => ({ ...prev, ...e.data.campaign }));
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ type: "goda:preview-ready" }, location.origin);
    return () => window.removeEventListener("message", on);
  }, []);
  // the first variant is the campaign being edited: keep it in sync with live edits
  const vs = useMemo<Variant[]>(() => {
    const ai = c.config.ai;
    const self: Variant = {
      ...variants[0], title: c.title, type: c.type, config: c.config,
      label: c.theme.tabLabel || variants[0].label,
      allowed: { face: perms.face && ai.face, background: perms.background && ai.background, filters: ai.filters, caption: perms.caption && ai.caption },
    };
    const labels = new Map(c.theme.companions.map((x) => [x.campaignId, x.label]));
    const rest = variants.slice(1).filter((v) => labels.has(v.id)).map((v) => ({ ...v, label: labels.get(v.id) || v.label }));
    return [self, ...rest];
  }, [c, variants, perms]);
  return <GuestView campaign={c} variants={vs} poweredBy={c.theme.showPoweredBy || !perms.removeBranding} preview canCustomCss={perms.customCss} />;
}

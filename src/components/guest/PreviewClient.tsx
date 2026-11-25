"use client";
import { useEffect, useState } from "react";
import type { CampaignPublic } from "@/lib/types";
import { GuestView } from "./GuestView";

export function PreviewClient({ initial, perms }: { initial: CampaignPublic; perms: { face: boolean; background: boolean; caption: boolean; removeBranding: boolean } }) {
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
  const allowed = {
    face: perms.face && c.config.ai.face,
    background: perms.background && c.config.ai.background,
    filters: c.config.ai.filters,
    caption: perms.caption && c.config.ai.caption,
  };
  return <GuestView campaign={c} allowed={allowed} poweredBy={c.theme.showPoweredBy || !perms.removeBranding} preview />;
}

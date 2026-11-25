import { all } from "@/lib/db";
import { apiUser, handle, HttpError } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { getCampaignById } from "@/lib/campaigns";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await apiUser();
  const c = await getCampaignById((await params).id);
  if (!c) throw new HttpError(404, "Không tìm thấy");
  if (c.owner_id !== user.id && !isAdmin(user)) throw new HttpError(403, "Không có quyền");
  if (!user.perms.exportCsv) throw new HttpError(403, "Gói hiện tại chưa hỗ trợ xuất CSV");

  const rows = await all<{ type: string; visitor_id: string; device: string; source: string; meta: string; created_at: number }>(
    "SELECT type, visitor_id, device, source, meta, created_at FROM events WHERE campaign_id = ? ORDER BY id DESC LIMIT 100000",
    [c.id],
  );
  const lines = [["thoi_gian", "su_kien", "khach", "thiet_bi", "nguon", "ten_khach"].join(",")];
  for (const r of rows) {
    let names = "";
    try {
      const m = r.meta ? JSON.parse(r.meta) : null;
      if (m?.names) names = Object.values(m.names).join(" | ");
    } catch {}
    lines.push([new Date(Number(r.created_at)).toISOString(), r.type, r.visitor_id, r.device, r.source, names].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="goda-frame-${c.slug}.csv"`,
    },
  });
});

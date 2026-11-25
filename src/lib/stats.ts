import "server-only";
import { all, one } from "./db";

export type EventType = "view" | "upload" | "ai_face" | "ai_bg" | "download" | "share" | "caption";
export const EVENT_TYPES: EventType[] = ["view", "upload", "ai_face", "ai_bg", "download", "share", "caption"];

const DAY = 86_400_000;
// local (Asia/Ho_Chi_Minh) timestamp expression for event time stored as epoch ms
const LOCAL_TS = "(to_timestamp(created_at / 1000.0) AT TIME ZONE 'Asia/Ho_Chi_Minh')";

export interface Stats {
  totals: Record<EventType, number>;
  visitors: number;
  creators: number; // unique visitors who downloaded
  conversion: number; // creators / visitors
  daily: { date: string; view: number; download: number }[];
  devices: { label: string; value: number }[];
  sources: { label: string; value: number }[];
  hours: number[]; // downloads by hour of day (local)
  perCampaign: Record<string, Partial<Record<EventType, number>>>;
}

function scope(ids: string[] | null) {
  if (ids === null) return { where: "1=1", args: [] as string[] };
  if (ids.length === 0) return { where: "0=1", args: [] as string[] };
  return { where: `campaign_id IN (${ids.map(() => "?").join(",")})`, args: ids };
}

/** ids = null → toàn hệ thống (admin). */
export async function getStats(ids: string[] | null, days = 30): Promise<Stats> {
  const s = scope(ids);
  const since = Date.now() - days * DAY;

  const [byType, visitors, creators, daily, devices, sources, hours, perCampaign] = await Promise.all([
    all<{ type: EventType; c: number }>(`SELECT type, COUNT(*) AS c FROM events WHERE ${s.where} GROUP BY type`, s.args),
    one<{ c: number }>(`SELECT COUNT(DISTINCT visitor_id) AS c FROM events WHERE ${s.where} AND type='view'`, s.args),
    one<{ c: number }>(`SELECT COUNT(DISTINCT visitor_id) AS c FROM events WHERE ${s.where} AND type='download'`, s.args),
    all<{ d: string; type: string; c: number }>(
      `SELECT to_char(${LOCAL_TS}, 'YYYY-MM-DD') AS d, type, COUNT(*) AS c FROM events
       WHERE ${s.where} AND created_at >= ? AND type IN ('view','download') GROUP BY 1, 2`,
      [...s.args, since],
    ),
    all<{ label: string; value: number }>(
      `SELECT COALESCE(device,'khác') AS label, COUNT(DISTINCT visitor_id) AS value FROM events
       WHERE ${s.where} AND type='view' GROUP BY 1 ORDER BY 2 DESC`,
      s.args,
    ),
    all<{ label: string; value: number }>(
      `SELECT COALESCE(NULLIF(source,''),'Trực tiếp') AS label, COUNT(DISTINCT visitor_id) AS value FROM events
       WHERE ${s.where} AND type='view' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      s.args,
    ),
    all<{ h: number; c: number }>(
      `SELECT EXTRACT(HOUR FROM ${LOCAL_TS})::int AS h, COUNT(*) AS c FROM events
       WHERE ${s.where} AND type='download' GROUP BY 1`,
      s.args,
    ),
    all<{ campaign_id: string; type: EventType; c: number }>(
      `SELECT campaign_id, type, COUNT(*) AS c FROM events WHERE ${s.where} GROUP BY campaign_id, type`,
      s.args,
    ),
  ]);

  const totals = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<EventType, number>;
  for (const r of byType) if (r.type in totals) totals[r.type] = Number(r.c);

  const dayMap = new Map<string, { view: number; download: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY + 7 * 3600_000).toISOString().slice(0, 10);
    dayMap.set(d, { view: 0, download: 0 });
  }
  for (const r of daily) {
    const e = dayMap.get(r.d);
    if (e && (r.type === "view" || r.type === "download")) e[r.type] = Number(r.c);
  }

  const hourArr = Array.from({ length: 24 }, () => 0);
  for (const r of hours) hourArr[Number(r.h)] = Number(r.c);

  const pc: Stats["perCampaign"] = {};
  for (const r of perCampaign) (pc[r.campaign_id] ||= {})[r.type] = Number(r.c);

  const v = Number(visitors?.c || 0);
  const c = Number(creators?.c || 0);
  return {
    totals,
    visitors: v,
    creators: c,
    conversion: v ? c / v : 0,
    daily: [...dayMap.entries()].map(([date, x]) => ({ date, ...x })),
    devices: devices.map((d) => ({ label: d.label, value: Number(d.value) })),
    sources: sources.map((d) => ({ label: d.label, value: Number(d.value) })),
    hours: hourArr,
    perCampaign: pc,
  };
}

export async function recentNames(campaignId: string, limit = 100) {
  const rows = await all<{ meta: string; created_at: number; device: string }>(
    `SELECT meta, created_at, device FROM events WHERE campaign_id = ? AND type='download' AND meta IS NOT NULL
     ORDER BY id DESC LIMIT ?`,
    [campaignId, limit],
  );
  return rows
    .map((r) => {
      try {
        const m = JSON.parse(r.meta) as { names?: Record<string, string> };
        const name = m.names ? Object.values(m.names).filter(Boolean).join(" · ") : "";
        return name ? { name, at: Number(r.created_at), device: r.device } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { name: string; at: number; device: string }[];
}

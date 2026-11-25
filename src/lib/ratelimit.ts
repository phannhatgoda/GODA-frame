import { HttpError } from "./api";

const buckets = new Map<string, { n: number; reset: number }>();

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}

/** Simple in-memory fixed-window limiter (per instance). Swap for Redis when scaling horizontally. */
export function rateLimit(req: Request, key: string, max: number, windowMs: number) {
  const k = `${key}:${clientIp(req)}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.reset < now) {
    buckets.set(k, { n: 1, reset: now + windowMs });
    if (buckets.size > 50_000) for (const [kk, v] of buckets) if (v.reset < now) buckets.delete(kk);
    return;
  }
  if (++b.n > max) throw new HttpError(429, "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút");
}

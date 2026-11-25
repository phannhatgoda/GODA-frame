import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { one, run } from "./db";
import { featuresFor } from "./plans";
import { handle, HttpError } from "./api";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function newKey() {
  const raw = "gf_live_" + randomBytes(24).toString("base64url");
  return { raw, hash: sha(raw), prefix: raw.slice(0, 14) };
}

/** Resolve `Authorization: Bearer gf_live_…` to its owner; enforces the `api` feature. */
export async function apiKeyUser(req: Request) {
  const h = req.headers.get("authorization") || "";
  const raw = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : new URL(req.url).searchParams.get("api_key") || "";
  if (!raw.startsWith("gf_live_")) throw new HttpError(401, "Thiếu hoặc sai API key (Authorization: Bearer gf_live_…)");
  const k = await one<{ id: string; owner_id: string }>("SELECT id, owner_id FROM api_keys WHERE key_hash = ?", [sha(raw)]);
  if (!k) throw new HttpError(401, "API key không hợp lệ hoặc đã bị thu hồi");
  const u = await one<{ id: string; role: string; plan: string; features: string; status: string }>("SELECT id, role, plan, features, status FROM users WHERE id = ?", [k.owner_id]);
  if (!u || u.status !== "active") throw new HttpError(403, "Tài khoản đang bị khoá");
  if (!(await featuresFor(u)).api) throw new HttpError(403, "Gói hiện tại chưa có quyền dùng API");
  run("UPDATE api_keys SET last_used_at = ? WHERE id = ?", [Date.now(), k.id]).catch(() => {});
  return u;
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function cors(res: Response) {
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

/** Route wrapper for the public API: JSON errors + CORS on every response (success or error). */
export function v1<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  const h = handle(fn);
  return async (...args: A) => cors(await h(...args));
}

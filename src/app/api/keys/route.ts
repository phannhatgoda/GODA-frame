import { z } from "zod";
import { nanoid } from "nanoid";
import { all, one, run, audit } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { newKey } from "@/lib/apikeys";

export const GET = handle(async () => {
  const u = await apiUser();
  return ok(await all("SELECT id, name, prefix, created_at, last_used_at FROM api_keys WHERE owner_id = ? ORDER BY created_at DESC", [u.id]));
});

export const POST = handle(async (req: Request) => {
  const u = await apiUser();
  if (!u.perms.api) throw new HttpError(403, "Gói hiện tại chưa có quyền dùng API");
  const { name } = z.object({ name: z.string().trim().min(1, "Đặt tên cho key").max(60) }).parse(await req.json());
  const n = await one<{ n: number }>("SELECT COUNT(*) AS n FROM api_keys WHERE owner_id = ?", [u.id]);
  if (Number(n?.n) >= 10) throw new HttpError(400, "Tối đa 10 API key");
  const k = newKey();
  const id = nanoid(12);
  await run("INSERT INTO api_keys (id, owner_id, name, prefix, key_hash, created_at) VALUES (?,?,?,?,?,?)", [id, u.id, name, k.prefix, k.hash, Date.now()]);
  await audit(u.id, "apikey.create", id, { name });
  return ok({ id, key: k.raw }, 201); // plaintext returned exactly once
});

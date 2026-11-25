import { nanoid } from "nanoid";
import { one, run } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { saveImage } from "@/lib/storage";

const MAX = 10 * 1024 * 1024;

export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Thiếu file");
  if (file.size > MAX) throw new HttpError(413, "File tối đa 10MB");

  const used = await one<{ s: number }>("SELECT COALESCE(SUM(size),0) s FROM assets WHERE owner_id = ?", [user.id]);
  if (Number(used?.s || 0) + file.size > user.perms.maxStorageMB * 1024 * 1024)
    throw new HttpError(403, `Đã hết dung lượng lưu trữ (${user.perms.maxStorageMB}MB)`);

  let saved;
  try {
    saved = await saveImage(user.id, Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new HttpError(415, "Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP");
  }
  await run("INSERT INTO assets (id, owner_id, path, mime, size, created_at) VALUES (?,?,?,?,?,?)", [
    nanoid(12), user.id, saved.rel, saved.mime, saved.size, Date.now(),
  ]);
  return ok({ url: `/api/files/${saved.rel}` }, 201);
});

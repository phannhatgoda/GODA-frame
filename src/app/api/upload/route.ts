import { one } from "@/lib/db";
import { apiUser, handle, ok, HttpError } from "@/lib/api";
import { saveImage } from "@/lib/storage";

// Vercel serverless functions accept request bodies up to 4.5 MB; the editor compresses larger images first.
const MAX = 4 * 1024 * 1024;

export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Thiếu file");
  if (file.size > MAX) throw new HttpError(413, "File tối đa 4MB");

  const used = await one<{ s: number }>("SELECT COALESCE(SUM(size),0) AS s FROM assets WHERE owner_id = ?", [user.id]);
  if (Number(used?.s || 0) + file.size > user.perms.maxStorageMB * 1024 * 1024)
    throw new HttpError(403, `Đã hết dung lượng lưu trữ (${user.perms.maxStorageMB}MB)`);

  try {
    const saved = await saveImage(user.id, Buffer.from(await file.arrayBuffer()));
    return ok({ url: saved.url }, 201);
  } catch (e) {
    if ((e as Error).message === "UNSUPPORTED") throw new HttpError(415, "Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP");
    throw e;
  }
});

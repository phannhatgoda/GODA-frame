import { run, audit } from "@/lib/db";
import { apiUser, handle, ok } from "@/lib/api";

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await apiUser();
  const id = (await params).id;
  await run("DELETE FROM api_keys WHERE id = ? AND owner_id = ?", [id, u.id]);
  await audit(u.id, "apikey.delete", id);
  return ok();
});

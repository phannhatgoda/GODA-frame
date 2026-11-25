import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUser, isAdmin, type SessionUser } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ok = (data: unknown = { ok: true }, status = 200) => NextResponse.json(data, { status });

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json({ error: e.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Lỗi máy chủ, vui lòng thử lại" }, { status: 500 });
    }
  };
}

export async function apiUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) throw new HttpError(401, "Bạn cần đăng nhập");
  return u;
}

export async function apiAdmin(): Promise<SessionUser> {
  const u = await apiUser();
  if (!isAdmin(u)) throw new HttpError(403, "Không có quyền truy cập");
  return u;
}

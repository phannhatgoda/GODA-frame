"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, Button, Field, Input } from "./ui";

export function AuthForm({ mode, signupOpen = true }: { mode: "login" | "register"; signupOpen?: boolean }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await api<{ redirect: string }>(`/api/auth/${mode}`, { method: "POST", json: f });
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : r.redirect);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" && (
        <>
          <Field label="Họ và tên">
            <Input name="name" required autoComplete="name" placeholder="Nguyễn Văn An" />
          </Field>
          <Field label="Tổ chức / Doanh nghiệp" hint="Không bắt buộc">
            <Input name="orgName" autoComplete="organization" placeholder="Công ty ABC" />
          </Field>
        </>
      )}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="ban@congty.vn" />
      </Field>
      <Field label="Mật khẩu" hint={mode === "register" ? "Tối thiểu 8 ký tự" : undefined}>
        <Input name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="••••••••" />
      </Field>
      {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{err}</p>}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {mode === "login" ? "Đăng nhập" : "Tạo tài khoản miễn phí"}
      </Button>
      <p className="text-center text-sm text-ink-3">
        {mode === "login" ? (
          signupOpen ? <>Chưa có tài khoản? <Link href="/register" className="font-medium text-brand hover:underline">Đăng ký</Link></> : <>Cần tài khoản? Liên hệ quản trị viên.</>
        ) : (
          <>Đã có tài khoản? <Link href="/login" className="font-medium text-brand hover:underline">Đăng nhập</Link></>
        )}
      </p>
    </form>
  );
}

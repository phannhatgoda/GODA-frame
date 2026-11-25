"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, Field, Input, useToast } from "./ui";

export function AccountForm({ name, orgName }: { name: string; orgName: string }) {
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<"" | "info" | "pw">("");
  async function submit(e: React.FormEvent<HTMLFormElement>, kind: "info" | "pw") {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(kind);
    try {
      await api("/api/me", { method: "PATCH", json: Object.fromEntries(new FormData(form)) });
      toast(kind === "pw" ? "Đã đổi mật khẩu" : "Đã lưu thông tin");
      if (kind === "pw") form.reset();
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setLoading("");
    }
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={(e) => submit(e, "info")} className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h3 className="font-semibold">Thông tin</h3>
        <Field label="Họ tên"><Input name="name" defaultValue={name} required minLength={2} /></Field>
        <Field label="Tổ chức"><Input name="orgName" defaultValue={orgName} /></Field>
        <Button type="submit" loading={loading === "info"}>Lưu</Button>
      </form>
      <form onSubmit={(e) => submit(e, "pw")} className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h3 className="font-semibold">Đổi mật khẩu</h3>
        <Field label="Mật khẩu hiện tại"><Input name="currentPassword" type="password" required autoComplete="current-password" /></Field>
        <Field label="Mật khẩu mới"><Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" /></Field>
        <Button type="submit" variant="dark" loading={loading === "pw"}>Đổi mật khẩu</Button>
      </form>
    </div>
  );
}

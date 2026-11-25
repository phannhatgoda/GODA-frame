"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DoorClosed, DoorOpen } from "lucide-react";
import { api, Button, cx, Switch, Textarea, useToast } from "../ui";

export function SignupToggle({ initial, canEdit }: { initial: { allowSignup: boolean; message: string }; canEdit: boolean }) {
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const dirty = v.message !== initial.message;
  async function save(next: typeof v) {
    setSaving(true);
    try {
      await api("/api/admin/access", { method: "PUT", json: next });
      setV(next);
      toast(next.allowSignup ? "Đã mở đăng ký tài khoản mới" : "Đã đóng đăng ký — chỉ admin tạo được tài khoản");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className={cx("mb-5 rounded-2xl border p-4 shadow-soft", v.allowSignup ? "border-line bg-white" : "border-amber-200 bg-amber-50/60")}>
      <div className="flex items-center gap-3">
        <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", v.allowSignup ? "bg-green-50 text-ok" : "bg-amber-100 text-warn")}>
          {v.allowSignup ? <DoorOpen className="size-5" /> : <DoorClosed className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Đăng ký tài khoản mới: {v.allowSignup ? "Đang mở" : "Đang đóng"}</div>
          <div className="text-sm text-ink-3">{v.allowSignup ? "Ai cũng có thể tự đăng ký tại /register." : "Chỉ quản trị viên tạo được tài khoản (nút “Thêm tài khoản”)."}{!canEdit && " · Chỉ Super Admin được thay đổi."}</div>
        </div>
        <Switch checked={v.allowSignup} disabled={!canEdit || saving} onChange={(on) => save({ ...v, allowSignup: on })} />
      </div>
      {!v.allowSignup && canEdit && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-2">Thông báo hiển thị ở trang đăng ký</span>
            <Textarea rows={2} value={v.message} maxLength={300} onChange={(e) => setV({ ...v, message: e.target.value })} className="text-sm" />
          </label>
          <Button variant="secondary" disabled={!dirty} loading={saving} onClick={() => save(v)}>Lưu thông báo</Button>
        </div>
      )}
    </div>
  );
}

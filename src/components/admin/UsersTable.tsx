"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings2, X } from "lucide-react";
import { api, Badge, Button, cx, Field, Input, Segmented, Select, Switch, useToast } from "../ui";
import { effectiveFeatures, FEATURE_META, PLANS, type Features, type Plan } from "@/lib/features";

type U = { id: string; email: string; name: string; org_name: string | null; role: string; status: string; plan: string; features: string; created_at: number; last_login_at: number | null; camps: number; downloads: number; storage: number };

const roleBadge = (r: string) => (r === "superadmin" ? <Badge tone="brand">Super Admin</Badge> : r === "admin" ? <Badge tone="blue">Admin</Badge> : <Badge>Người dùng</Badge>);
const d = (t: number | null) => (t ? new Date(t).toLocaleDateString("vi-VN") : "—");

export function UsersTable({ users, me }: { users: U[]; me: { id: string; role: string } }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "user" | "admin" | "suspended">("all");
  const [edit, setEdit] = useState<U | null>(null);
  const list = useMemo(
    () =>
      users.filter((u) => {
        if (filter === "user" && u.role !== "user") return false;
        if (filter === "admin" && u.role === "user") return false;
        if (filter === "suspended" && u.status !== "suspended") return false;
        const s = q.toLowerCase();
        return !s || u.email.includes(s) || u.name.toLowerCase().includes(s) || (u.org_name || "").toLowerCase().includes(s);
      }),
    [users, q, filter],
  );
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, email, tổ chức…" className="pl-9" />
        </div>
        <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "Tất cả" }, { value: "user", label: "Khách hàng" }, { value: "admin", label: "Quản trị" }, { value: "suspended", label: "Bị khoá" }]} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-ink-3">
              <tr><th className="px-4 py-3">Người dùng</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Gói</th><th className="px-4 py-3 text-right">Chiến dịch</th><th className="px-4 py-3 text-right">Ảnh tạo</th><th className="px-4 py-3">Đăng nhập</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((u) => (
                <tr key={u.id} className={cx("hover:bg-stone-50/60", u.status === "suspended" && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name} {u.id === me.id && <span className="text-xs text-ink-3">(bạn)</span>}</div>
                    <div className="text-xs text-ink-3">{u.email}{u.org_name ? ` · ${u.org_name}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">{roleBadge(u.role)} {u.status === "suspended" && <Badge tone="bad">Khoá</Badge>}</td>
                  <td className="px-4 py-3 font-medium uppercase">{u.role === "user" ? u.plan : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.camps}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.downloads.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3 text-ink-3">{d(u.last_login_at)}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setEdit(u)}><Settings2 className="size-3.5" /> Quản lý</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <p className="py-10 text-center text-sm text-ink-3">Không có kết quả</p>}
      </div>
      {edit && <EditUser u={edit} me={me} onClose={() => setEdit(null)} />}
    </>
  );
}

function EditUser({ u, me, onClose }: { u: U; me: { id: string; role: string }; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const overrides0 = (() => { try { return JSON.parse(u.features || "{}") as Partial<Features>; } catch { return {}; } })();
  const [role, setRole] = useState(u.role);
  const [status, setStatus] = useState(u.status);
  const [plan, setPlan] = useState(u.plan as Plan);
  const [ov, setOv] = useState<Partial<Features>>(overrides0);
  const [loading, setLoading] = useState(false);
  const eff = effectiveFeatures({ plan, role: "user", features: ov });
  const base = PLANS[plan].features;
  const isSuper = me.role === "superadmin";
  const self = u.id === me.id;
  const lockedTarget = u.role === "superadmin" && !isSuper;

  const setF = <K extends keyof Features>(k: K, v: Features[K]) => {
    setOv((o) => {
      const n = { ...o };
      if (base[k] === v) delete n[k];
      else n[k] = v;
      return n;
    });
  };

  async function save() {
    setLoading(true);
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", json: { role, status, plan, features: ov } });
      toast("Đã cập nhật người dùng");
      router.refresh();
      onClose();
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setLoading(false);
    }
  }
  async function remove() {
    if (!confirm(`Xoá vĩnh viễn ${u.email} cùng toàn bộ chiến dịch & dữ liệu?`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      toast("Đã xoá tài khoản");
      router.refresh();
      onClose();
    } catch (e) {
      toast((e as Error).message, "bad");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-in h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{u.name}</h2>
            <p className="text-sm text-ink-3">{u.email} · tham gia {d(u.created_at)}</p>
            <p className="mt-1 text-xs text-ink-3">{u.camps} chiến dịch · {u.downloads.toLocaleString("vi-VN")} ảnh · {(u.storage / 1048576).toFixed(1)} MB</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5"><X className="size-5" /></button>
        </div>
        {lockedTarget && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Chỉ Super Admin mới chỉnh sửa được tài khoản này.</p>}

        <fieldset disabled={lockedTarget} className="mt-6 space-y-5">
          <Field label="Vai trò" hint={!isSuper ? "Chỉ Super Admin được phân quyền" : self ? "Không thể tự đổi vai trò" : "Admin: xem toàn bộ dữ liệu, quản lý người dùng. Super Admin: thêm quyền phân quyền & xoá."}>
            <Select value={role} disabled={!isSuper || self} onChange={(e) => setRole(e.target.value)}>
              <option value="user">Người dùng (khách hàng)</option><option value="admin">Admin</option><option value="superadmin">Super Admin</option>
            </Select>
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-line p-3">
            <div><div className="text-sm font-medium">Trạng thái hoạt động</div><div className="text-xs text-ink-3">Khoá: không đăng nhập được, các trang frame tạm đóng</div></div>
            <Switch checked={status === "active"} disabled={self} onChange={(v) => setStatus(v ? "active" : "suspended")} />
          </div>

          {role === "user" ? (
            <>
              <Field label="Gói dịch vụ">
                <Segmented className="w-full" value={plan} onChange={(v) => { setPlan(v); setOv({}); }} options={(Object.keys(PLANS) as Plan[]).map((p) => ({ value: p, label: PLANS[p].name }))} />
              </Field>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink-2">Phân phối tính năng</span>
                  {Object.keys(ov).length > 0 && <button className="text-xs font-medium text-brand" onClick={() => setOv({})}>Khôi phục theo gói</button>}
                </div>
                <div className="divide-y divide-line rounded-xl border border-line">
                  {(Object.keys(FEATURE_META) as (keyof Features)[]).map((k) => {
                    const m = FEATURE_META[k];
                    const custom = k in ov;
                    return (
                      <div key={k} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-medium">{m.label}{custom && <span className="size-1.5 rounded-full bg-brand" title="Tuỳ chỉnh riêng" />}</div>
                          <div className="text-xs text-ink-3">{m.hint}</div>
                        </div>
                        {m.kind === "bool" ? (
                          <Switch checked={eff[k] as boolean} onChange={(v) => setF(k, v as Features[typeof k])} />
                        ) : (
                          <Input type="number" min={0} className="h-9 w-24 text-right text-sm" value={eff[k] as number} onChange={(e) => setF(k, Math.max(0, +e.target.value || 0) as Features[typeof k])} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-stone-50 p-3 text-sm text-ink-3">Tài khoản quản trị tự động có toàn bộ tính năng.</p>
          )}
        </fieldset>

        <div className="sticky bottom-0 -mx-6 mt-6 flex gap-2 border-t border-line bg-white px-6 py-4">
          {isSuper && !self && <Button variant="danger" onClick={remove}>Xoá</Button>}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button onClick={save} loading={loading} disabled={lockedTarget}>Lưu thay đổi</Button>
        </div>
      </div>
    </div>
  );
}

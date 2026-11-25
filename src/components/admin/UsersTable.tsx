"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings2, UserPlus, X } from "lucide-react";
import { api, Badge, Button, cx, Field, Input, Segmented, Select, Switch, useToast } from "../ui";
import { NO_FEATURES, resolveFeatures, type FeatureKey, type Features } from "@/lib/features";
import { FeatureEditor } from "./FeatureEditor";

type U = { id: string; email: string; name: string; org_name: string | null; role: string; status: string; plan: string; features: string; created_at: number; last_login_at: number | null; camps: number; downloads: number; storage: number };
export type PlanLite = { id: string; name: string; features: Features; is_default: boolean };

const roleBadge = (r: string) => (r === "superadmin" ? <Badge tone="brand">Super Admin</Badge> : r === "admin" ? <Badge tone="blue">Admin</Badge> : <Badge>Khách hàng</Badge>);
const d = (t: number | null) => (t ? new Date(t).toLocaleDateString("vi-VN") : "—");

export function UsersTable({ users, me, plans }: { users: U[]; me: { id: string; role: string }; plans: PlanLite[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "user" | "admin" | "suspended">("all");
  const [edit, setEdit] = useState<U | null>(null);
  const [creating, setCreating] = useState(false);
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;
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
        <Button onClick={() => setCreating(true)}><UserPlus className="size-4" /> Thêm tài khoản</Button>
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
                  <td className="px-4 py-3 font-medium">{u.role === "user" ? <>{planName(u.plan)}{u.features && u.features !== "{}" && <span className="ml-1 text-xs text-brand" title="Có tuỳ chỉnh riêng">●</span>}</> : "—"}</td>
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
      {edit && <EditUser u={edit} me={me} plans={plans} onClose={() => setEdit(null)} />}
      {creating && <CreateUser me={me} plans={plans} onClose={() => setCreating(false)} />}
    </>
  );
}

function Drawer({ title, sub, onClose, children, footer }: { title: string; sub?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-in flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-line p-6">
          <div><h2 className="text-xl font-bold">{title}</h2>{sub}</div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        <div className="flex gap-2 border-t border-line px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

function CreateUser({ me, plans, onClose }: { me: { role: string }; plans: PlanLite[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [pw] = useState(() => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8).toUpperCase());
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const f = Object.fromEntries(new FormData(e.currentTarget));
      await api("/api/admin/users", { method: "POST", json: { ...f, role } });
      toast("Đã tạo tài khoản — gửi email & mật khẩu tạm cho người dùng");
      router.refresh();
      onClose();
    } catch (err) {
      toast((err as Error).message, "bad");
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <Drawer title="Thêm tài khoản" sub={<p className="text-sm text-ink-3">Tạo tài khoản cho khách hàng hoặc thêm người cùng quản trị hệ thống.</p>} onClose={onClose}
        footer={<><div className="flex-1" /><Button type="button" variant="secondary" onClick={onClose}>Huỷ</Button><Button type="submit" loading={loading}>Tạo tài khoản</Button></>}>
        <div className="space-y-4">
          <Field label="Vai trò" hint={me.role !== "superadmin" ? "Chỉ Super Admin mới tạo được tài khoản quản trị" : "Super Admin có toàn quyền như bạn, kể cả phân quyền và cấu hình gói."}>
            <Segmented className="w-full" value={role} onChange={(v) => me.role === "superadmin" || v === "user" ? setRole(v) : null}
              options={[{ value: "user", label: "Khách hàng" }, { value: "admin", label: "Admin" }, { value: "superadmin", label: "Super Admin" }]} />
          </Field>
          <Field label="Họ tên"><Input name="name" required minLength={2} /></Field>
          <Field label="Email"><Input name="email" type="email" required /></Field>
          <Field label="Tổ chức"><Input name="orgName" /></Field>
          <Field label="Mật khẩu tạm" hint="Người dùng đổi lại trong trang Tài khoản sau khi đăng nhập"><Input name="password" defaultValue={pw} required minLength={8} className="font-mono" /></Field>
          {role === "user" && (
            <Field label="Gói">
              <Select name="plan" defaultValue={(plans.find((p) => p.is_default) ?? plans[0])?.id}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </Drawer>
    </form>
  );
}

function EditUser({ u, me, plans, onClose }: { u: U; me: { id: string; role: string }; plans: PlanLite[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const overrides0 = (() => { try { return JSON.parse(u.features || "{}") as Partial<Features>; } catch { return {}; } })();
  const [role, setRole] = useState(u.role);
  const [status, setStatus] = useState(u.status);
  const [plan, setPlan] = useState(plans.some((p) => p.id === u.plan) ? u.plan : (plans.find((p) => p.is_default) ?? plans[0])?.id);
  const [ov, setOv] = useState<Partial<Features>>(overrides0);
  const [loading, setLoading] = useState(false);
  const planRow = plans.find((p) => p.id === plan);
  const base = { ...NO_FEATURES, ...planRow?.features };
  const eff = resolveFeatures({ role: "user", features: ov }, planRow);
  const isSuper = me.role === "superadmin";
  const self = u.id === me.id;
  const lockedTarget = u.role === "superadmin" && !isSuper;

  const setF = (k: FeatureKey, v: number | boolean) =>
    setOv((o) => {
      const n = { ...o } as Record<string, unknown>;
      if (base[k] === v) delete n[k];
      else n[k] = v;
      return n as Partial<Features>;
    });

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
    <Drawer
      title={u.name}
      onClose={onClose}
      sub={<><p className="text-sm text-ink-3">{u.email} · tham gia {d(u.created_at)}</p><p className="mt-1 text-xs text-ink-3">{u.camps} chiến dịch · {u.downloads.toLocaleString("vi-VN")} ảnh · {(u.storage / 1048576).toFixed(1)} MB</p></>}
      footer={<>{isSuper && !self && <Button variant="danger" onClick={remove}>Xoá</Button>}<div className="flex-1" /><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save} loading={loading} disabled={lockedTarget}>Lưu thay đổi</Button></>}
    >
      {lockedTarget && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Chỉ Super Admin mới chỉnh sửa được tài khoản này.</p>}
      <fieldset disabled={lockedTarget} className="space-y-5">
        <Field label="Vai trò" hint={!isSuper ? "Chỉ Super Admin được phân quyền" : self ? "Không thể tự đổi vai trò của chính mình" : "Super Admin: toàn quyền như bạn (phân quyền, cấu hình gói, xoá). Admin: xem toàn bộ dữ liệu, quản lý khách hàng."}>
          <Segmented className={cx("w-full", (!isSuper || self) && "pointer-events-none opacity-60")} value={role} onChange={setRole} options={[{ value: "user", label: "Khách hàng" }, { value: "admin", label: "Admin" }, { value: "superadmin", label: "Super Admin" }]} />
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-line p-3">
          <div><div className="text-sm font-medium">Trạng thái hoạt động</div><div className="text-xs text-ink-3">Khoá: không đăng nhập được, các trang frame tạm đóng</div></div>
          <Switch checked={status === "active"} disabled={self} onChange={(v) => setStatus(v ? "active" : "suspended")} />
        </div>
        {role === "user" ? (
          <>
            <Field label="Gói dịch vụ">
              <Select value={plan} onChange={(e) => { setPlan(e.target.value); setOv({}); }}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_default ? " (mặc định)" : ""}</option>)}
              </Select>
            </Field>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink-2">Tính năng riêng cho tài khoản này <span className="font-normal text-ink-3">(● = khác gói)</span></span>
                {Object.keys(ov).length > 0 && <button type="button" className="text-xs font-medium text-brand" onClick={() => setOv({})}>Khôi phục theo gói</button>}
              </div>
              <FeatureEditor value={eff} base={base} onChange={setF} />
            </div>
          </>
        ) : (
          <p className="rounded-xl bg-stone-50 p-3 text-sm text-ink-3">Tài khoản quản trị tự động có toàn bộ tính năng.</p>
        )}
      </fieldset>
    </Drawer>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { api, Badge, Button, Field, Input, Switch, useToast } from "../ui";
import { FEATURE_GROUPS, FEATURE_META, NO_FEATURES, type FeatureKey, type Features } from "@/lib/features";
import { FeatureEditor } from "./FeatureEditor";

export type Plan = { id: string; name: string; price: string; description: string; features: Features; is_default: boolean; users: number };

export function PlansManager({ plans, canEdit }: { plans: Plan[]; canEdit: boolean }) {
  const [edit, setEdit] = useState<Partial<Plan> | null>(null);
  const router = useRouter();
  const toast = useToast();
  async function remove(p: Plan) {
    if (!confirm(`Xoá gói "${p.name}"? ${p.users} người dùng sẽ được chuyển về gói mặc định.`)) return;
    try {
      await api(`/api/admin/plans/${p.id}`, { method: "DELETE" });
      toast("Đã xoá gói");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "bad");
    }
  }
  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEdit({ name: "", price: "", description: "", features: { ...NO_FEATURES, maxCampaigns: 3, maxStorageMB: 100 }, is_default: false })}><Plus className="size-4" /> Tạo gói mới</Button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-lg font-bold">{p.name}{p.is_default && <Badge tone="brand"><Star className="size-3" /> Mặc định</Badge>}</div>
                <div className="text-sm text-ink-3">{p.description || "—"}</div>
              </div>
              <div className="text-right"><div className="font-semibold">{p.price || "—"}</div><div className="text-xs text-ink-3">{p.users} người dùng</div></div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {(["maxCampaigns", "maxStorageMB", "maxDomains"] as FeatureKey[]).map((k) => (
                <div key={k} className="rounded-xl bg-stone-50 py-2"><div className="font-bold tabular-nums">{p.features[k] as number}</div><div className="text-[11px] text-ink-3">{FEATURE_META[k].label.replace(" tối đa", "").replace("Số ", "")}</div></div>
              ))}
            </div>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm">
              {FEATURE_GROUPS.flatMap((g) => g.keys).filter((k) => FEATURE_META[k].kind === "bool").map((k) => (
                <li key={k} className={p.features[k] ? "flex items-center gap-2" : "flex items-center gap-2 text-ink-3/60"}>
                  {p.features[k] ? <Check className="size-4 text-ok" /> : <X className="size-4" />}{FEATURE_META[k].label}
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <Button size="sm" variant="secondary" onClick={() => setEdit(p)}><Pencil className="size-3.5" /> Sửa</Button>
                <Button size="sm" variant="ghost" onClick={() => setEdit({ ...p, id: undefined, name: p.name + " (bản sao)", is_default: false })}><Copy className="size-3.5" /> Nhân bản</Button>
                {!p.is_default && <Button size="sm" variant="ghost" className="ml-auto text-bad" onClick={() => remove(p)}><Trash2 className="size-3.5" /></Button>}
              </div>
            )}
          </div>
        ))}
      </div>
      {edit && <PlanDialog plan={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function PlanDialog({ plan, onClose }: { plan: Partial<Plan>; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState({ name: plan.name || "", price: plan.price || "", description: plan.description || "", is_default: !!plan.is_default, features: { ...NO_FEATURES, ...plan.features } as Features });
  const [loading, setLoading] = useState(false);
  async function save() {
    setLoading(true);
    try {
      if (plan.id) await api(`/api/admin/plans/${plan.id}`, { method: "PATCH", json: p });
      else await api("/api/admin/plans", { method: "POST", json: p });
      toast(plan.id ? "Đã lưu gói — áp dụng ngay cho người dùng thuộc gói" : "Đã tạo gói mới");
      router.refresh();
      onClose();
    } catch (e) {
      toast((e as Error).message, "bad");
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-in flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line p-6">
          <h2 className="text-xl font-bold">{plan.id ? `Sửa gói ${plan.name}` : "Tạo gói mới"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5"><X className="size-5" /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên gói"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="VD: Doanh nghiệp FPT" /></Field>
            <Field label="Giá hiển thị"><Input value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} placeholder="VD: 2.000.000đ/năm" /></Field>
            <Field label="Mô tả ngắn" className="sm:col-span-2"><Input value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-line p-3">
            <span><span className="block text-sm font-medium">Gói mặc định</span><span className="text-xs text-ink-3">Người tự đăng ký mới sẽ vào gói này</span></span>
            <Switch checked={p.is_default} onChange={(v) => setP({ ...p, is_default: v })} />
          </label>
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink-2">Chức năng của gói</div>
            <FeatureEditor value={p.features} onChange={(k, v) => setP((x) => ({ ...x, features: { ...x.features, [k]: v } }))} />
          </div>
        </div>
        <div className="flex gap-2 border-t border-line px-6 py-4"><div className="flex-1" /><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save} loading={loading} disabled={!p.name.trim()}>Lưu gói</Button></div>
      </div>
    </div>
  );
}

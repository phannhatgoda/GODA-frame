"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, UserRoundCheck } from "lucide-react";
import { api, Button, cx, Field, Input, useToast } from "./ui";
import { TEMPLATES, type TemplateId } from "@/lib/types";
import { TemplateThumb } from "./TemplateThumb";

export function NewCampaign({ canInvite, premium }: { canInvite: boolean; premium: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<"avatar" | "invitation">("avatar");
  const [template, setTemplate] = useState<TemplateId>("aura");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const r = await api<{ id: string }>("/api/campaigns", { method: "POST", json: { type, title, template } });
      router.push(`/dashboard/c/${r.id}`);
    } catch (e) {
      toast((e as Error).message, "bad");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">1. Bạn muốn tạo gì?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { v: "avatar" as const, icon: UserRoundCheck, t: "Frame avatar", d: "Khách tải ảnh, AI căn mặt vào khung, tải về đổi ảnh đại diện." },
              { v: "invitation" as const, icon: Mail, t: "Thiệp mời", d: "Khách nhập tên (và ảnh), nhận thiệp mời cá nhân hoá để chia sẻ." },
            ].map((o) => {
              const locked = o.v === "invitation" && !canInvite;
              return (
                <button
                  key={o.v}
                  disabled={locked}
                  onClick={() => {
                    setType(o.v);
                    setTemplate(o.v === "invitation" && premium ? "paper" : "aura");
                  }}
                  className={cx("relative rounded-2xl border-2 p-4 text-left transition disabled:opacity-50", type === o.v ? "border-brand bg-brand-50/40" : "border-line hover:border-stone-300")}
                >
                  <o.icon className={cx("size-6", type === o.v ? "text-brand" : "text-ink-3")} />
                  <div className="mt-3 font-semibold">{o.t}</div>
                  <div className="mt-1 text-sm text-ink-3">{o.d}</div>
                  {locked && <Lock className="absolute right-3 top-3 size-4 text-ink-3" />}
                </button>
              );
            })}
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <h2 className="font-semibold">2. Chọn giao diện trang</h2>
          <p className="mt-1 text-sm text-ink-3">Có thể đổi và tuỳ biến bất kỳ lúc nào.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => {
              const t = TEMPLATES[id];
              const locked = t.premium && !premium;
              return (
                <button key={id} disabled={locked} onClick={() => setTemplate(id)} className={cx("group rounded-2xl border-2 p-1.5 text-left transition disabled:opacity-60", template === id ? "border-brand" : "border-transparent hover:border-line")}>
                  <TemplateThumb id={id} />
                  <div className="flex items-center justify-between px-1 pb-1 pt-2">
                    <span className="text-sm font-semibold">{t.name}</span>
                    {locked ? <Lock className="size-3.5 text-ink-3" /> : t.premium ? <span className="text-[10px] font-bold text-brand">PRO</span> : null}
                  </div>
                  <div className="px-1 pb-1 text-xs text-ink-3">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-soft lg:sticky lg:top-10">
        <h2 className="font-semibold">3. Đặt tên chiến dịch</h2>
        <Field label="Tên hiển thị" className="mt-4" hint="Ví dụ: Year End Party 2026, Kick-off Q1…">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Year End Party 2026" autoFocus onKeyDown={(e) => e.key === "Enter" && title.trim().length >= 2 && create()} />
        </Field>
        <Button className="mt-5 w-full" size="lg" disabled={title.trim().length < 2} loading={loading} onClick={create}>Tạo & bắt đầu thiết kế</Button>
      </aside>
    </div>
  );
}

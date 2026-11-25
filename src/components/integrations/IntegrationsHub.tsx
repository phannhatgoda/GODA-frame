"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Lock, Plus, Trash2, TriangleAlert } from "lucide-react";
import { api, Button, cx, Field, Input, Segmented, Select, useToast } from "../ui";

type Key = { id: string; name: string; prefix: string; created_at: number; last_used_at: number | null };

function Code({ code, label }: { code: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-stone-400">
        <span>{label || "Mã"}</span>
        <button onClick={async () => { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1500); }} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-stone-300 hover:bg-white/10">
          {ok ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />} {ok ? "Đã chép" : "Sao chép"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12.5px] leading-relaxed text-stone-100"><code>{code}</code></pre>
    </div>
  );
}

function Locked({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
      <Lock className="mx-auto size-7 text-ink-3" />
      <div className="mt-2 font-semibold">{title}</div>
      <p className="mt-1 text-sm text-ink-3">{text}</p>
    </div>
  );
}

export function IntegrationsHub({ base, campaigns, keys, canEmbed, canApi }: { base: string; campaigns: { id: string; slug: string; title: string; status: string }[]; keys: Key[]; canEmbed: boolean; canApi: boolean }) {
  const [slug, setSlug] = useState(campaigns[0]?.slug || "");
  const [mode, setMode] = useState<"iframe" | "inline" | "button">("button");
  const c = campaigns.find((x) => x.slug === slug);

  const snippets = {
    iframe: `<iframe src="${base}/embed/${slug}"\n  style="width:100%;height:720px;border:0;border-radius:16px"\n  allow="clipboard-write; web-share; camera"\n  title="${c?.title || "GODA.Frame"}"></iframe>`,
    inline: `<div data-goda-frame="${slug}" data-height="720"></div>\n<script src="${base}/widget.js" async></script>`,
    button: `<div data-goda-frame="${slug}" data-mode="button"\n     data-label="Tạo avatar ngay" data-color="#FF5A1F"></div>\n<script src="${base}/widget.js" async></script>`,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Nhúng vào website / landing page</h2>
        <p className="text-sm text-ink-3">Dán đoạn mã vào trang web (WordPress, Ladipage, Webflow, HTML…). Khách tạo ảnh ngay trên trang của bạn; thống kê ghi nhận với nguồn <code className="rounded bg-stone-100 px-1">embed:tên-miền</code>.</p>
        {!canEmbed ? (
          <div className="mt-4"><Locked title="Gói hiện tại chưa có tính năng Nhúng" text="Liên hệ GODA.MEDIA để mở tính năng." /></div>
        ) : campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-ink-3">Tạo một chiến dịch trước để lấy mã nhúng.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Chiến dịch">
                <Select value={slug} onChange={(e) => setSlug(e.target.value)}>
                  {campaigns.map((x) => <option key={x.id} value={x.slug}>{x.title}{x.status !== "published" ? " (chưa xuất bản)" : ""}</option>)}
                </Select>
              </Field>
              <Field label="Kiểu hiển thị">
                <Segmented value={mode} onChange={setMode} options={[{ value: "button", label: "Nút + popup" }, { value: "inline", label: "Khung trong trang" }, { value: "iframe", label: "iframe thuần" }]} />
              </Field>
            </div>
            {c && c.status !== "published" && <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><TriangleAlert className="size-4" /> Chiến dịch chưa xuất bản — khách sẽ thấy “Trang chưa mở”.</p>}
            <Code code={snippets[mode]} label={mode === "iframe" ? "HTML" : "HTML — dán ở vị trí muốn hiển thị"} />
            <div className="grid gap-3 text-sm text-ink-2 sm:grid-cols-3">
              <div className="rounded-xl bg-stone-50 p-3"><b>Nút + popup</b><br />Gọn nhất cho landing page: một nút, bấm mở trình tạo ảnh toàn màn hình.</div>
              <div className="rounded-xl bg-stone-50 p-3"><b>Khung trong trang</b><br />Trình tạo ảnh hiển thị luôn trong một section của trang.</div>
              <div className="rounded-xl bg-stone-50 p-3"><b>iframe thuần</b><br />Dùng khi trình dựng web không cho chèn script.</div>
            </div>
            <a href={`${base}/embed/${slug}`} target="_blank" className="inline-block text-sm font-medium text-brand hover:underline">Mở bản nhúng để xem thử →</a>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold">API</h2>
        <p className="text-sm text-ink-3">Lấy danh sách chiến dịch, số liệu và dòng sự kiện để đưa vào dashboard nội bộ, Google Sheets, Power BI…</p>
        {!canApi ? (
          <div className="mt-4"><Locked title="Gói hiện tại chưa có quyền dùng API" text="Liên hệ GODA.MEDIA để mở tính năng." /></div>
        ) : (
          <>
            <ApiKeys keys={keys} />
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold">Tài liệu nhanh</h3>
              <p className="text-sm text-ink-3">Xác thực bằng header <code className="rounded bg-stone-100 px-1">Authorization: Bearer gf_live_…</code>. CORS mở cho mọi domain — <b>không</b> đặt key trong mã chạy trên trình duyệt công khai.</p>
              <Code label="Danh sách chiến dịch" code={`curl ${base}/api/v1/campaigns \\\n  -H "Authorization: Bearer $GODA_API_KEY"`} />
              <Code label="Thống kê 1 chiến dịch (id hoặc slug, mặc định 30 ngày)" code={`curl "${base}/api/v1/campaigns/${slug || "<id>"}?days=30" \\\n  -H "Authorization: Bearer $GODA_API_KEY"`} />
              <Code label="Dòng sự kiện — đồng bộ tăng dần bằng next_since" code={`curl "${base}/api/v1/campaigns/<id>/events?type=download&since=0&limit=500" \\\n  -H "Authorization: Bearer $GODA_API_KEY"\n\n# → { "data": [{ "type": "download", "names": {"name": "Nguyễn An"}, "device": "iPhone", "source": "zalo", "at": "…" }], "next_since": 1764060000000 }`} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ApiKeys({ keys }: { keys: Key[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function create() {
    setLoading(true);
    try {
      const r = await api<{ key: string }>("/api/keys", { method: "POST", json: { name } });
      setCreated(r.key);
      setName("");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setLoading(false);
    }
  }
  async function revoke(k: Key) {
    if (!confirm(`Thu hồi key "${k.name}"? Hệ thống đang dùng key này sẽ mất quyền truy cập ngay.`)) return;
    await api(`/api/keys/${k.id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên key, VD: Dashboard Power BI" />
        <Button onClick={create} loading={loading} disabled={!name.trim()} className="h-11 shrink-0"><Plus className="size-4" /> Tạo key</Button>
      </div>
      {created && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <div className="mb-2 text-sm font-semibold text-green-800">Sao chép key ngay — sẽ không hiển thị lại lần nữa</div>
          <Code code={created} label="API key" />
        </div>
      )}
      <div className="divide-y divide-line rounded-xl border border-line">
        {keys.length === 0 && <p className="p-4 text-center text-sm text-ink-3">Chưa có API key</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <KeyRound className="size-4 text-ink-3" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{k.name}</div>
              <div className="font-mono text-xs text-ink-3">{k.prefix}…</div>
            </div>
            <div className={cx("hidden text-right text-xs text-ink-3 sm:block")}>
              Tạo {new Date(k.created_at).toLocaleDateString("vi-VN")}<br />
              {k.last_used_at ? `Dùng lần cuối ${new Date(k.last_used_at).toLocaleString("vi-VN")}` : "Chưa dùng"}
            </div>
            <Button size="sm" variant="ghost" onClick={() => revoke(k)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, ExternalLink, Globe, Loader2, Lock, RefreshCw, Trash2, XCircle } from "lucide-react";
import { api, Badge, Button, Input, Select, useToast } from "../ui";

type D = { id: string; hostname: string; campaign_id: string | null; verify_token: string; verified_at: number | null };
type Check = { txtOk: boolean; routeOk: boolean; verified: boolean; vercel: { ok: boolean; message?: string }; automation: boolean; found: { txt: string[]; cname: string[]; a: string[] } };

export function DomainsManager({ domains, campaigns, allowed, max, target, apexA, txtPrefix }: { domains: D[]; campaigns: { id: string; title: string; slug: string }[]; allowed: boolean; max: number; target: string; apexA: string; txtPrefix: string }) {
  const router = useRouter();
  const toast = useToast();
  const [host, setHost] = useState("");
  const [camp, setCamp] = useState(campaigns[0]?.id || "");
  const [adding, setAdding] = useState(false);

  if (!allowed)
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <Lock className="mx-auto size-8 text-ink-3" />
        <h2 className="mt-3 text-lg font-semibold">Gói hiện tại chưa có Tên miền riêng</h2>
        <p className="mt-1 text-ink-3">Dùng tên miền của doanh nghiệp (VD: <b>frame.congty.vn</b>) thay cho link GODA. Liên hệ GODA.MEDIA để nâng cấp.</p>
      </div>
    );

  async function add() {
    setAdding(true);
    try {
      await api("/api/domains", { method: "POST", json: { hostname: host, campaignId: camp || null } });
      setHost("");
      toast("Đã thêm — hãy cấu hình DNS theo hướng dẫn");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h3 className="font-semibold">Thêm tên miền</h3>
        <p className="text-sm text-ink-3">Nên dùng tên miền con, ví dụ <code className="rounded bg-stone-100 px-1">frame.congty.vn</code> hoặc <code className="rounded bg-stone-100 px-1">yep2026.congty.vn</code>. Đã dùng {domains.length}/{max}.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="frame.congty.vn" className="sm:flex-1" />
          <Select value={camp} onChange={(e) => setCamp(e.target.value)} className="h-11 sm:w-64">
            <option value="">— Trang chủ: chưa gắn chiến dịch —</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
          <Button className="h-11" onClick={add} loading={adding} disabled={!host.trim() || domains.length >= max}><Globe className="size-4" /> Thêm</Button>
        </div>
      </div>
      {domains.map((d) => <DomainCard key={d.id} d={d} campaigns={campaigns} target={target} apexA={apexA} txtPrefix={txtPrefix} />)}
    </div>
  );
}

function DomainCard({ d, campaigns, target, apexA, txtPrefix }: { d: D; campaigns: { id: string; title: string; slug: string }[]; target: string; apexA: string; txtPrefix: string }) {
  const router = useRouter();
  const toast = useToast();
  const [check, setCheck] = useState<Check | null>(null);
  const [loading, setLoading] = useState(false);
  // registrable zone: congty.vn, or congty.com.vn for second-level ccTLDs
  const labels = d.hostname.split(".");
  const zoneLen = /^(com|net|org|edu|gov|ac|info|biz|name|pro|health|int)$/.test(labels[labels.length - 2] || "") && labels[labels.length - 1].length === 2 ? 3 : 2;
  const sub = labels.length > zoneLen;
  const rel = labels.slice(0, labels.length - zoneLen).join(".");
  const name = sub ? rel : "@";
  const records = [
    { type: "TXT", name: `${txtPrefix}${sub ? "." + rel : ""}`, value: d.verify_token, ok: check?.txtOk ?? !!d.verified_at, why: "Xác minh bạn sở hữu tên miền" },
    sub
      ? { type: "CNAME", name, value: target, ok: check?.routeOk, why: "Trỏ tên miền về GODA.Frame" }
      : { type: "A", name: "@", value: apexA, ok: check?.routeOk, why: "Trỏ tên miền gốc về GODA.Frame" },
  ];
  const copy = async (t: string) => { await navigator.clipboard.writeText(t); toast("Đã sao chép"); };

  async function verify() {
    setLoading(true);
    try {
      const r = await api<Check>(`/api/domains/${d.id}/verify`, { method: "POST" });
      setCheck(r);
      if (r.verified && r.routeOk) toast("🎉 Tên miền đã hoạt động");
      else if (r.verified) toast("Đã xác minh sở hữu — còn bản ghi trỏ tên miền");
      else toast("Chưa thấy bản ghi TXT — DNS có thể mất 5–30 phút để cập nhật", "bad");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setLoading(false);
    }
  }
  async function map(campaignId: string) {
    try {
      await api(`/api/domains/${d.id}`, { method: "PATCH", json: { campaignId: campaignId || null } });
      toast("Đã cập nhật trang chủ của tên miền");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "bad");
    }
  }
  async function remove() {
    if (!confirm(`Gỡ tên miền ${d.hostname}?`)) return;
    await api(`/api/domains/${d.id}`, { method: "DELETE" });
    router.refresh();
  }

  const live = !!d.verified_at && check?.routeOk !== false;
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center gap-3">
        <Globe className="size-5 text-ink-3" />
        <a href={`https://${d.hostname}`} target="_blank" className="flex items-center gap-1 font-mono text-[15px] font-semibold hover:underline">{d.hostname}<ExternalLink className="size-3.5 opacity-50" /></a>
        {d.verified_at ? (live ? <Badge tone="ok">● Đã xác minh</Badge> : <Badge tone="warn">Đã xác minh · chưa trỏ</Badge>) : <Badge tone="warn">Chờ cấu hình DNS</Badge>}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={verify} loading={loading}><RefreshCw className="size-3.5" /> Kiểm tra</Button>
          <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="size-3.5" /></Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-3">Trang chủ hiển thị:</span>
        <Select value={d.campaign_id || ""} onChange={(e) => map(e.target.value)} className="h-9 w-auto min-w-56">
          <option value="">— Chưa gắn —</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
        <span className="text-xs text-ink-3">Các chiến dịch khác: <code>{d.hostname}/&lt;link-chiến-dịch&gt;</code></span>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-ink-3"><tr><th className="px-3 py-2">Loại</th><th className="px-3 py-2">Tên (Host)</th><th className="px-3 py-2">Giá trị</th><th className="px-3 py-2" /></tr></thead>
          <tbody className="divide-y divide-line">
            {records.map((r) => (
              <tr key={r.type}>
                <td className="px-3 py-2.5 font-semibold">{r.type}</td>
                <td className="px-3 py-2.5"><button onClick={() => copy(r.name)} className="flex items-center gap-1.5 font-mono text-xs hover:text-brand">{r.name}<Copy className="size-3" /></button></td>
                <td className="px-3 py-2.5"><button onClick={() => copy(r.value)} className="flex items-center gap-1.5 break-all text-left font-mono text-xs hover:text-brand">{r.value}<Copy className="size-3 shrink-0" /></button><div className="text-[11px] text-ink-3">{r.why}</div></td>
                <td className="px-3 py-2.5 text-right">{r.ok === undefined ? (loading ? <Loader2 className="ml-auto size-4 animate-spin" /> : null) : r.ok ? <CheckCircle2 className="ml-auto size-5 text-ok" /> : <XCircle className="ml-auto size-5 text-bad" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-3">Thêm 2 bản ghi trên ở nơi quản lý DNS (PA Vietnam, Mắt Bão, Cloudflare…), đợi 5–30 phút rồi bấm <b>Kiểm tra</b>. Chứng chỉ HTTPS được cấp tự động.</p>
      {check && check.verified && !check.vercel.ok && (
        <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          {check.automation ? `Chưa gắn được tên miền vào máy chủ: ${check.vercel.message}` : "Quản trị viên GODA sẽ kích hoạt HTTPS cho tên miền này trong vòng 24h (hoặc cấu hình tự động bằng VERCEL_API_TOKEN)."}
        </p>
      )}
    </div>
  );
}

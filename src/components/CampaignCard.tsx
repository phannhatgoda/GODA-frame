import Link from "next/link";
import { BarChart3, ExternalLink, PenLine } from "lucide-react";
import { Badge } from "./ui";

export function statusBadge(s: string) {
  if (s === "published") return <Badge tone="ok">● Đang chạy</Badge>;
  if (s === "archived") return <Badge>Đã lưu trữ</Badge>;
  return <Badge tone="warn">Bản nháp</Badge>;
}

export function CampaignCard({ c, views, downloads, owner }: { c: { id: string; slug: string; title: string; type: string; status: string; theme: { background: string; primary: string }; config: { frameUrl: string; width: number; height: number } }; views: number; downloads: number; owner?: string }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <Link href={`/dashboard/c/${c.id}`} className="relative block aspect-[4/3] overflow-hidden" style={{ background: c.theme.background }}>
        <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 30% 20%, ${c.theme.primary}33, transparent 60%)` }} />
        {c.config.frameUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.config.frameUrl} alt="" className="absolute inset-0 m-auto max-h-[80%] max-w-[80%] object-contain drop-shadow-xl transition duration-500 group-hover:scale-[1.04]" />
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {statusBadge(c.status)}
          <Badge tone={c.type === "invitation" ? "blue" : "brand"}>{c.type === "invitation" ? "Thiệp mời" : "Avatar"}</Badge>
        </div>
      </Link>
      <div className="p-4">
        <div className="truncate font-semibold">{c.title}</div>
        <div className="truncate text-xs text-ink-3">{owner ? owner + " · " : ""}/f/{c.slug}</div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <span><b className="tabular-nums">{views.toLocaleString("vi-VN")}</b> <span className="text-ink-3">xem</span></span>
            <span><b className="tabular-nums">{downloads.toLocaleString("vi-VN")}</b> <span className="text-ink-3">tạo</span></span>
          </div>
          <div className="flex gap-0.5">
            <Link href={`/dashboard/c/${c.id}`} className="rounded-lg p-2 text-ink-3 hover:bg-black/5 hover:text-ink" title="Chỉnh sửa"><PenLine className="size-4" /></Link>
            <Link href={`/dashboard/c/${c.id}/stats`} className="rounded-lg p-2 text-ink-3 hover:bg-black/5 hover:text-ink" title="Thống kê"><BarChart3 className="size-4" /></Link>
            <a href={`/f/${c.slug}`} target="_blank" className="rounded-lg p-2 text-ink-3 hover:bg-black/5 hover:text-ink" title="Mở trang"><ExternalLink className="size-4" /></a>
          </div>
        </div>
      </div>
    </div>
  );
}

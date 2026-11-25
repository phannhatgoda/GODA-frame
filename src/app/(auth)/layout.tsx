import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute -left-32 top-10 size-[520px] rounded-full bg-brand/40 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 size-[420px] rounded-full bg-fuchsia-500/30 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <div className="mb-10 flex gap-4">
            {["/samples/avatar-ring.svg", "/samples/avatar-badge.svg"].map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s} src={s} alt="" className={`size-40 rounded-3xl bg-gradient-to-br from-stone-200 to-stone-400 p-2 shadow-2xl ${i ? "translate-y-6 -rotate-3" : "rotate-3"}`} />
            ))}
          </div>
          <p className="max-w-md text-3xl font-semibold leading-tight">Một đường link. Hàng nghìn nhân viên cùng khoác lên “màu áo” chung.</p>
          <p className="mt-4 max-w-md text-white/60">Frame avatar & thiệp mời có thương hiệu riêng — AI căn mặt, tách nền ngay trên điện thoại của khách.</p>
        </div>
      </div>
    </div>
  );
}

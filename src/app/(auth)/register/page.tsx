import Link from "next/link";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { getAccess } from "@/lib/site";
export const metadata = { title: "Đăng ký" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const access = await getAccess();
  if (!access.allowSignup)
    return (
      <div className="animate-in">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand"><Lock className="size-6" /></span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Đăng ký đang tạm đóng</h1>
        <p className="mt-2 whitespace-pre-line text-ink-3">{access.message}</p>
        <Link href="/login" className="mt-8 inline-flex h-12 items-center rounded-xl bg-ink px-6 font-medium text-white">Đăng nhập</Link>
      </div>
    );
  return (
    <div className="animate-in">
      <h1 className="text-3xl font-bold tracking-tight">Tạo tài khoản</h1>
      <p className="mb-8 mt-2 text-ink-3">Miễn phí 2 chiến dịch. Không cần thẻ thanh toán.</p>
      <Suspense><AuthForm mode="register" /></Suspense>
    </div>
  );
}

import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
export const metadata = { title: "Đăng ký" };
export default function Page() {
  return (
    <div className="animate-in">
      <h1 className="text-3xl font-bold tracking-tight">Tạo tài khoản</h1>
      <p className="mb-8 mt-2 text-ink-3">Miễn phí 2 chiến dịch. Không cần thẻ thanh toán.</p>
      <Suspense><AuthForm mode="register" /></Suspense>
    </div>
  );
}

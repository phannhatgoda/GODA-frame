import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
export const metadata = { title: "Đăng nhập" };
export default function Page() {
  return (
    <div className="animate-in">
      <h1 className="text-3xl font-bold tracking-tight">Chào mừng trở lại</h1>
      <p className="mb-8 mt-2 text-ink-3">Đăng nhập để quản lý frame và thiệp mời của bạn.</p>
      <Suspense><AuthForm mode="login" /></Suspense>
    </div>
  );
}

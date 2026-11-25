import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { getAccess } from "@/lib/site";
export const metadata = { title: "Đăng nhập" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const access = await getAccess();
  return (
    <div className="animate-in">
      <h1 className="text-3xl font-bold tracking-tight">Chào mừng trở lại</h1>
      <p className="mb-8 mt-2 text-ink-3">Đăng nhập để quản lý frame và thiệp mời của bạn.</p>
      <Suspense><AuthForm mode="login" signupOpen={access.allowSignup} /></Suspense>
    </div>
  );
}

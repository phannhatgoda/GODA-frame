import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <div className="text-7xl font-extrabold text-brand">404</div>
        <h1 className="mt-2 text-xl font-semibold">Không tìm thấy trang</h1>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white">Về trang chủ</Link>
      </div>
    </div>
  );
}

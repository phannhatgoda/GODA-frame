import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32 ? process.env.AUTH_SECRET : "dev-only-insecure-secret-goda-frame-0000000",
  );

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";
const PRIMARY = (() => {
  try {
    return APP_URL ? new URL(APP_URL).hostname.toLowerCase() : "";
  } catch {
    return "";
  }
})();
const EXTRA = (process.env.APP_HOSTS || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);

/** Hosts that serve the GODA.Frame app itself (everything else is a customer's custom domain). */
function isAppHost(host: string) {
  if (!PRIMARY) return true; // custom domains are disabled until NEXT_PUBLIC_APP_URL is configured
  return (
    host === PRIMARY ||
    host === "www." + PRIMARY ||
    EXTRA.includes(host) ||
    host.endsWith(".vercel.app") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  );
}

// paths that must keep working unchanged on custom domains (assets, API used by the guest page)
const PASSTHROUGH = /^\/(api|_next|mediapipe|samples|embed|site|widget\.js|favicon\.ico|robots\.txt)(\/|$)/;

export async function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname } = req.nextUrl;

  if (!isAppHost(host)) {
    if (PASSTHROUGH.test(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = `/site/${encodeURIComponent(host)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  const guarded = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const authPage = pathname === "/login" || pathname === "/register";
  if (!guarded && !authPage) return NextResponse.next();

  const token = req.cookies.get("goda_session")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      valid = true;
    } catch {}
  }
  if (!valid && guarded) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (valid && authPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mediapipe/).*)"],
};

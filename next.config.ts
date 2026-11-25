import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel builds its own output; "standalone" is for the Docker image.
  output: process.env.VERCEL ? undefined : "standalone",
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async headers() {
    return [
      // /embed/* is frameable by any site: we intentionally send no X-Frame-Options / frame-ancestors.
      { source: "/widget.js", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=()" },
        ],
      },
    ];
  },
};
export default nextConfig;

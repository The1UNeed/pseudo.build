import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");
const isDev = process.env.NODE_ENV !== "production";

const clerkOrigins = [
  "https://*.clerk.accounts.dev",
  "https://clerk.pseudo.build",
  "https://*.clerk.com",
  "https://challenges.cloudflare.com",
];
const convexOrigins = ["https://*.convex.cloud", "wss://*.convex.cloud", "https://*.convex.site"];
const vercelOrigins = ["https://va.vercel-scripts.com", "https://vitals.vercel-insights.com"];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} ${[...clerkOrigins, ...vercelOrigins].join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  `connect-src 'self' ${[...clerkOrigins, ...convexOrigins, ...vercelOrigins].join(" ")}${isDev ? " ws: http://localhost:*" : ""}`,
  `frame-src ${clerkOrigins.join(" ")}`,
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  async headers() {
    const immutableAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];

    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/fonts/:path*", headers: immutableAssetHeaders },
      { source: "/branding/:path*", headers: immutableAssetHeaders },
      { source: "/_next/static/:path*", headers: immutableAssetHeaders },
    ];
  },
  transpilePackages: ["@pseudobuild/compiler", "@pseudobuild/workspace"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;

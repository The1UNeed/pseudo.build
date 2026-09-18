import type { NextConfig } from "next";
import path from "node:path";
import { buildContentSecurityPolicy } from "./src/lib/csp";

const monorepoRoot = path.resolve(__dirname, "../..");

const contentSecurityPolicy = buildContentSecurityPolicy({
  isDev: process.env.NODE_ENV !== "production",
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

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
    // Next already serves /_next/static with immutable caching.
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
    ];
  },
  transpilePackages: ["@pseudobuild/compiler", "@pseudobuild/workspace"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;

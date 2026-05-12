import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    const immutableAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];

    return [
      {
        source: "/fonts/:path*",
        headers: immutableAssetHeaders,
      },
      {
        source: "/branding/:path*",
        headers: immutableAssetHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: immutableAssetHeaders,
      },
    ];
  },
  transpilePackages: ["@igcse/compiler", "@igcse/workspace"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@igcse/compiler", "@igcse/workspace"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;

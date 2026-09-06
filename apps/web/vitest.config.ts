import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://pseudocode-compiler-preview.vercel.app/",
      },
    },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: [
      {
        find: /^@clerk\/nextjs\/server$/,
        replacement: path.resolve(__dirname, "src/lib/clerk-electron-server.ts"),
      },
      {
        find: /^@clerk\/nextjs$/,
        replacement: path.resolve(__dirname, "src/lib/clerk-electron-components.tsx"),
      },
      { find: "@", replacement: path.resolve(__dirname, "src") },
      {
        find: /^@pseudobuild\/compiler$/,
        replacement: path.resolve(__dirname, "../../packages/compiler/src/index.ts"),
      },
      {
        find: /^@pseudobuild\/compiler\/types$/,
        replacement: path.resolve(__dirname, "../../packages/compiler/src/types.ts"),
      },
      {
        find: /^@pseudobuild\/workspace$/,
        replacement: path.resolve(__dirname, "../../packages/workspace/src/index.ts"),
      },
    ],
  },
});

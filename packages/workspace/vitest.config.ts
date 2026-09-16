import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Just below measured coverage (2026-09-15). Raise these as tests are added.
      thresholds: { lines: 58, statements: 58, branches: 49, functions: 64 },
    },
  },
});

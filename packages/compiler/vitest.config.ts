import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Just below measured coverage (2026-09-15). Raise these as tests are added.
      thresholds: { lines: 82, statements: 82, branches: 77, functions: 94 },
    },
  },
});

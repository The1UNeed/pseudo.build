import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Just below measured coverage (2026-09-15). Raise these as tests are added.
      thresholds: { lines: 91, statements: 91, branches: 85, functions: 97 },
    },
  },
});

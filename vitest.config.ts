import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});

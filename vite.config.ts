import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/practiceEngine.ts", "src/storage.ts"],
      thresholds: {
        perFile: true,
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85,
      },
    },
  },
});

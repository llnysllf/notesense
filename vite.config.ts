import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const sharedEntry = fileURLToPath(new URL("./shared/src/index.ts", import.meta.url));

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'none'",
].join("; ");

function notesenseSecurityPolicyPlugin(): Plugin {
  const charsetMeta = '    <meta charset="UTF-8" />';
  const cspMeta = `    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;

  return {
    name: "notesense-security-policy",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(charsetMeta, `${charsetMeta}\n${cspMeta}`);
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@notesense/shared": sharedEntry,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest,txt,xml}"],
        navigateFallback: null,
      },
      devOptions: { enabled: false },
    }),
    notesenseSecurityPolicyPlugin(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "shared/**/*.test.ts", "scripts/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "src/App.tsx",
        "src/practiceEngine.ts",
        "src/storage.ts",
        "src/hooks/useSettings.ts",
        "src/hooks/usePracticeProgress.ts",
        "src/hooks/useDataPortability.ts",
        "src/hooks/usePracticeSession.ts",
        "shared/src/practiceData.ts",
        "shared/src/merge.ts",
      ],
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

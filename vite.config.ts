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
        "src/audio.ts",
        "src/components/AppSectionNav.tsx",
        "src/components/PianoKeybed.tsx",
        "src/components/PianoKeyboard.tsx",
        "src/components/PitchSequenceAnswer.tsx",
        "src/components/PitchTrainingControls.tsx",
        "src/components/PracticeDataView.tsx",
        "src/components/PracticeSettingsView.tsx",
        "src/components/PracticeStatsPanel.tsx",
        "src/components/SheetStaff.tsx",
        "src/components/SongLibrary.tsx",
        "src/components/SongPlayer.tsx",
        "src/components/SongsWorkspace.tsx",
        "src/components/PracticeWorkspace.tsx",
        "src/components/ReadingRangeSelector.tsx",
        "src/noteData.ts",
        "src/observability.ts",
        "src/practiceEngine.ts",
        "src/songEngine.ts",
        "src/songLibraryData.ts",
        "src/storage.ts",
        "src/hooks/useSettings.ts",
        "src/hooks/usePracticeProgress.ts",
        "src/hooks/useDataPortability.ts",
        "src/hooks/usePracticeDashboard.ts",
        "src/hooks/usePracticeItems.ts",
        "src/hooks/useReadingShortcuts.ts",
        "src/hooks/practiceSessionLogic.ts",
        "src/hooks/usePracticeSession.ts",
        "src/hooks/useSongSession.ts",
        "shared/src/practiceData.ts",
        "shared/src/practiceSettings.ts",
        "shared/src/songData.ts",
        "shared/src/songAnalysis.ts",
        "shared/src/merge.ts",
        "shared/src/music/time.ts",
        "shared/src/music/pitch.ts",
        "shared/src/music/score.ts",
        "shared/src/music/validation.ts",
        "shared/src/music/compileTimeline.ts",
        "shared/src/music/legacySongAdapter.ts",
        "shared/src/curriculum/competencies.ts",
        "shared/src/curriculum/dimensions.ts",
        "shared/src/curriculum/prerequisites.ts",
        "shared/src/curriculum/difficulty.ts",
        "shared/src/exercises/answer.ts",
        "shared/src/exercises/scoringPolicy.ts",
        "shared/src/exercises/exerciseDefinition.ts",
        "shared/src/exercises/seededRng.ts",
        "shared/src/exercises/generator.ts",
        "shared/src/exercises/validation.ts",
        "shared/src/exercises/generators/readingNote.ts",
        "shared/src/exercises/generators/pitchNote.ts",
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

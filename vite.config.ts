import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

import {
  MARKETING_PAGE_DATA,
  SITE_URL,
  SOCIAL_CARD_URL,
  sitemapUrls,
  withoutTrailingSlash,
} from "./shared/src/marketing/pageData.ts";

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

// GitHub Pages serves static files only and cannot rewrite unknown paths to the
// app shell, so a direct load or reload of a deep link such as /progress/map
// would 404. Emitting the built shell as 404.html makes Pages serve the app for
// those paths, and the router then resolves the real path from the URL.
function notesensePagesFallbackPlugin(): Plugin {
  return {
    name: "notesense-pages-fallback",
    apply: "build",
    // Runs after the HTML plugin has written the shell, so the finished file
    // (including the injected security policy) is what gets copied.
    closeBundle() {
      const outDir = fileURLToPath(new URL("./dist", import.meta.url));
      const shellPath = join(outDir, "index.html");
      if (!existsSync(shellPath)) return;

      copyFileSync(shellPath, join(outDir, "404.html"));
    },
  };
}

// A crawler, a shared link, and a browser tab all read the <head> of whatever
// HTML the server actually returns. A single-page app has one of those, so
// every public page would otherwise carry the home page's title and
// description.
//
// This writes one small HTML file per public page — the built shell with its
// head tags swapped — so a direct load of /rhythm is already correct before any
// JavaScript runs. It is not server rendering: the body is still the app's
// empty root, and the client takes over as usual. It is the metadata that has
// to be right at the moment the response arrives.
function notesenseMarketingPrerenderPlugin(): Plugin {
  // Tags are matched whole and rewritten whole, because the shell is formatted
  // source: Prettier breaks a long tag across lines, and a pattern that assumed
  // `name="x" content="y"` sat on one line stopped matching the moment the
  // description got longer. It failed silently, leaving every page with the
  // home page's description.
  const replaceMeta = (html: string, attribute: string, key: string, content: string) =>
    html.replace(
      new RegExp(`<meta[^>]*${attribute}="${key}"[^>]*>`),
      `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`,
    );

  const replaceCanonical = (html: string, href: string) =>
    html.replace(/<link[^>]*rel="canonical"[^>]*>/, `<link rel="canonical" href="${href}" />`);

  return {
    name: "notesense-marketing-prerender",
    apply: "build",
    // After the fallback plugin, so 404.html stays a copy of the home shell.
    closeBundle() {
      const outDir = fileURLToPath(new URL("./dist", import.meta.url));
      const shellPath = join(outDir, "index.html");

      // Read first and handle absence from the failure, rather than asking
      // whether the file exists and then reading it: between those two calls
      // the answer can change.
      let shell: string;
      try {
        shell = readFileSync(shellPath, "utf8");
      } catch {
        return;
      }

      for (const page of MARKETING_PAGE_DATA) {
        const canonical = page.path === "/" ? SITE_URL : `${withoutTrailingSlash(SITE_URL)}${page.path}`;
        let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
        html = replaceMeta(html, "name", "description", page.description);
        html = replaceMeta(html, "property", "og:title", page.title);
        html = replaceMeta(html, "property", "og:description", page.description);
        html = replaceMeta(html, "property", "og:url", canonical);
        html = replaceMeta(html, "property", "og:image", SOCIAL_CARD_URL);
        html = replaceMeta(html, "name", "twitter:title", page.title);
        html = replaceMeta(html, "name", "twitter:description", page.description);
        html = replaceMeta(html, "name", "twitter:image", SOCIAL_CARD_URL);
        html = replaceCanonical(html, canonical);

        if (page.path === "/") {
          writeFileSync(shellPath, html);
          continue;
        }

        const pageDir = join(outDir, page.path.replace(/^\//, ""));
        mkdirSync(pageDir, { recursive: true });
        writeFileSync(join(pageDir, "index.html"), html);
      }

      // The sitemap lists the public pages and nothing else: the app's own
      // destinations live behind a client router and are of no use to a crawler.
      const urls = sitemapUrls(SITE_URL)
        .map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`)
        .join("\n");
      writeFileSync(
        join(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      );
    },
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest,txt,xml}"],
        navigateFallback: null,
      },
      devOptions: { enabled: false },
    }),
    notesenseSecurityPolicyPlugin(),
    notesensePagesFallbackPlugin(),
    notesenseMarketingPrerenderPlugin(),
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
        "src/components/TodayWorkspace.tsx",
        "src/components/PracticeWorkspace.tsx",
        "src/components/MidiSettings.tsx",
        "src/components/RhythmWorkspace.tsx",
        "src/components/ReadingControls.tsx",
        "src/components/ReadingModeSelector.tsx",
        "src/components/MistakeReplay.tsx",
        "src/components/ReadingRangeSelector.tsx",
        "src/components/ImportWorkspace.tsx",
        "src/components/import/ImportPreview.tsx",
        "src/hooks/useMidiImport.ts",
        "src/components/SingingWorkspace.tsx",
        "src/components/voice/SingingTargets.tsx",
        "src/components/voice/SingingResult.tsx",
        "src/voice/microphone.ts",
        "src/hooks/useSingingDrill.ts",
        "src/components/EarWorkspace.tsx",
        "src/components/ear/EarPrompt.tsx",
        "src/components/ear/EarChoiceAnswer.tsx",
        "src/components/ear/EarNoteAnswer.tsx",
        "src/components/ear/EarTranscriber.tsx",
        "src/components/ear/EarFeedback.tsx",
        "src/earAudio.ts",
        "src/statsView.ts",
        "src/hooks/useEarSession.ts",
        "src/hooks/useEarDrill.ts",
        "src/hooks/useTranscriber.ts",
        "src/components/AssessWorkspace.tsx",
        "src/components/AssessmentStaff.tsx",
        "src/components/PlacementCheckView.tsx",
        "src/components/ReadingScoreReport.tsx",
        "src/components/ReadingScoreRunner.tsx",
        "src/components/AppShell.tsx",
        "src/assessmentClock.ts",
        "src/shareCardImage.ts",
        "src/hooks/useAssessment.ts",
        "src/hooks/usePlacementCheck.ts",
        "src/hooks/useReadingScoreHistory.ts",
        "src/hooks/useReadingScoreRun.ts",
        "src/routes.ts",
        "src/hooks/useDailyPlan.ts",
        "src/hooks/usePlanCompletion.ts",
        "src/hooks/useRoundMisses.ts",
        "src/hooks/useRhythmSession.ts",
        "src/metronome.ts",
        "src/hooks/useAppRoute.ts",
        "src/settingsChange.ts",
        "src/practiceFeedback.ts",
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
        "shared/src/runtime/input.ts",
        "shared/src/runtime/transport.ts",
        "shared/src/runtime/promptMachine.ts",
        "shared/src/runtime/sessionMachine.ts",
        "shared/src/runtime/answerCollector.ts",
        "shared/src/runtime/scorer.ts",
        "shared/src/midi/message.ts",
        "shared/src/midi/latency.ts",
        "shared/src/midi/adapter.ts",
        "shared/src/rhythm/pattern.ts",
        "shared/src/rhythm/grade.ts",
        "shared/src/reading/readingMode.ts",
        "shared/src/reading/mistakes.ts",
        "shared/src/reading/testForm.ts",
        "shared/src/plan/dailyPlan.ts",
        "shared/src/plan/normalize.ts",
        "shared/src/evidence/attemptEvent.ts",
        "shared/src/evidence/mastery.ts",
        "shared/src/evidence/scheduler.ts",
        "shared/src/evidence/migration.ts",
        "shared/src/evidence/projections.ts",
        "shared/src/import/byteReader.ts",
        "shared/src/import/midiFile.ts",
        "shared/src/import/midiToSong.ts",
        "shared/src/voice/pitchDetect.ts",
        "shared/src/voice/contour.ts",
        "shared/src/voice/sungScore.ts",
        "shared/src/voice/vocalRange.ts",
        "shared/src/voice/singingExercise.ts",
        "shared/src/ear/theory.ts",
        "shared/src/ear/sequence.ts",
        "shared/src/ear/transcription.ts",
        "shared/src/exercises/generators/earChoice.ts",
        "shared/src/exercises/generators/earPlayback.ts",
        "shared/src/exercises/generators/earTranscription.ts",
        "shared/src/assessment/passage.ts",
        "shared/src/assessment/readingScore.ts",
        "shared/src/assessment/placement.ts",
        "shared/src/assessment/history.ts",
        "shared/src/assessment/shareCard.ts",
        "shared/src/sound/soundWorld.ts",
        "shared/src/sound/registry.ts",
        "shared/src/sound/cachePolicy.ts",
        "src/sound/soundWorlds.ts",
        "src/hooks/useSoundWorld.ts",
        "src/components/SoundWorldPicker.tsx",
        "shared/src/marketing/capability.ts",
        "shared/src/marketing/page.ts",
        "shared/src/marketing/claims.ts",
        "shared/src/marketing/pageData.ts",
        "src/Site.tsx",
        "src/hooks/useMarketingSite.ts",
        "src/hooks/useReadingDemo.ts",
        "src/hooks/usePageMetadata.ts",
        "src/components/marketing/MarketingShell.tsx",
        "src/components/marketing/MarketingPageView.tsx",
        "src/components/marketing/ReadingDemo.tsx",
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

import { existsSync, readFileSync } from "node:fs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required accessibility file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing expected accessibility text: ${snippet}`);
    }
  }
}

console.log("Accessibility contract report");

requireSnippets("docs/ACCESSIBILITY.md", [
  "# Accessibility Contract",
  "## Product Standard",
  "## WCAG Alignment",
  "## Keyboard And Focus",
  "## Screen Reader Semantics",
  "## Visual And Motion",
  "## Automated Coverage",
  "## Assistive Technology Review Plan",
  "## Manual Review",
  "## Change Rules",
  "WCAG 2.2 Level AA",
  "owner-maintained self-assessment target",
  "not a third-party accessibility audit, VPAT, ACR, or legal certification",
  "Conformance evidence must combine automated checks, keyboard review, visual review, and assistive-technology review notes when UI behavior changes.",
  "Known gaps, unavailable review devices, or deferred manual checks must be documented in the pull request and release evidence before merge.",
  "macOS VoiceOver with Safari",
  "NVDA with Firefox or Chrome",
  "iOS VoiceOver or Android TalkBack",
  "browser zoom at 200%",
  "npm run accessibility:check",
  "npm run test:e2e",
  "npm run test:e2e:resilience",
  "npm run test:e2e:visual",
  "npm run browsers:check",
  "Browser support expectations live in [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md).",
  "eslint-plugin-jsx-a11y",
  "axe-core scans",
  "Lighthouse accessibility scoring",
  "prefers-reduced-motion",
]);

requireSnippets("package.json", [
  '"accessibility:check": "node scripts/check-accessibility-contracts.mjs"',
  "npm run design:check && npm run accessibility:check && npm run testing:check && npm run browsers:check && npm run performance:check && npm run operations:check && npm run observability:check && npm run release:safety && npm run release:notes",
  '"@axe-core/playwright"',
  '"eslint-plugin-jsx-a11y"',
]);

requireSnippets("eslint.config.js", [
  'import jsxA11y from "eslint-plugin-jsx-a11y";',
  '"jsx-a11y": jsxA11y',
  "...jsxA11y.configs.recommended.rules",
]);

requireSnippets("playwright.config.ts", [
  'serviceWorkers: "block"',
  'name: "chromium"',
  'name: "firefox"',
  'name: "webkit"',
  'name: "mobile-chromium"',
]);

requireSnippets("e2e/app.spec.ts", [
  'test("loads with no automated accessibility violations"',
  "new AxeBuilder({ page }).analyze()",
  "postRoundAccessibilityScanResults",
  'test("answers with keyboard shortcuts in both practice modes"',
  'toHaveAttribute("aria-pressed", "true")',
  'test("keeps the responsive layout inside the viewport"',
]);

requireSnippets("e2e/error-boundary.spec.ts", [
  'test("shows an accessible recovery screen when rendering fails"',
  'getByRole("alert")',
  'getByRole("button", { name: "Reload NoteSense" })',
  "new AxeBuilder({ page }).analyze()",
]);

requireSnippets("src/styles.css", [
  "--color-focus:",
  "button:focus-visible",
  "input:focus-visible",
  "@media (prefers-reduced-motion: reduce)",
  "@media (max-width: 640px)",
]);

requireSnippets("src/App.tsx", [
  'aria-labelledby="app-title"',
  'aria-live="polite"',
  'aria-label="Practice mode"',
  'aria-pressed={mode === "reading"}',
  'aria-pressed={mode === "pitch"}',
  'aria-label="Current round status"',
  "aria-label={`Answer ${answer}`}",
]);

requireSnippets("src/components/PracticeStatsPanel.tsx", [
  'aria-label="Practice progress"',
  'aria-live="polite"',
  'aria-label="Reading range"',
  "aria-pressed={settings.readingRange === range.id}",
  'aria-label="Round length"',
  "aria-pressed={settings.roundLength === length}",
  'role="status"',
  'aria-label="Import data file"',
  "tabIndex={-1}",
]);

requireSnippets("src/components/ErrorBoundary.tsx", [
  'aria-labelledby="error-title"',
  'role="alert"',
  'aria-live="assertive"',
  "Reload NoteSense",
]);

requireSnippets("src/components/MusicStaff.tsx", [
  'role="img"',
  "aria-label={`${clefLabel} staff note ${note.id}`",
  'aria-hidden="true"',
]);

requireSnippets("src/components/PracticeInsights.tsx", [
  "aria-label={`${modeLabel} trend metrics`}",
  'role="img"',
  "aria-label={chartLabel}",
]);

requireSnippets("src/components/DailyGoal.tsx", [
  'role="meter"',
  'aria-label="Daily practice goal progress"',
  "aria-valuemin={0}",
  "aria-valuemax={100}",
  "aria-valuenow={summary.completionPercent}",
]);

requireSnippets("src/components/MasteryMap.tsx", [
  "aria-label={`${modeLabel} mastery map`}",
  "aria-label={getItemAriaLabel(item)}",
  'aria-hidden="true"',
]);

requireSnippets("docs/QUALITY.md", [
  "Accessibility contract docs and `npm run accessibility:check` stay aligned when keyboard, screen reader, focus, contrast, motion, or automated accessibility coverage changes.",
  "Accessibility conformance evidence stays aligned when WCAG targets, manual assistive-technology review, or accessibility release evidence changes.",
  "For accessibility-contract feedback:",
  "npm run accessibility:check",
  "`docs/ACCESSIBILITY.md` defines the product accessibility standard, WCAG 2.2 Level AA target, keyboard and focus rules, screen reader semantics, visual and motion rules, automated coverage, assistive-technology review expectations, manual review expectations, and change process.",
  "`npm run accessibility:check` verifies that source semantics, styles, browser tests, lint rules, and docs stay aligned.",
  "Manual review notes identify any unavailable assistive-technology profile or deferred WCAG evidence.",
]);

requireSnippets("docs/RELEASE.md", [
  "Treat accessibility-contract results as release evidence when keyboard behavior, screen reader semantics, focus visibility, contrast, motion, or automated accessibility coverage changes.",
  "Treat accessibility conformance results as release evidence when WCAG targets, manual assistive-technology review, or accessibility self-assessment scope changes.",
  "Whether `npm run accessibility:check` still proves keyboard, screen reader, focus, motion, axe, cross-browser, and Lighthouse coverage are aligned.",
  "Whether accessibility evidence still supports the documented WCAG 2.2 Level AA self-assessment target for changed workflows.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/ACCESSIBILITY.md` documents the WCAG alignment, assistive-technology review, keyboard, screen reader, focus, contrast, motion, and automated accessibility coverage contract.",
  "`scripts/check-accessibility-contracts.mjs` owns accessibility-contract drift checks for source semantics, styles, browser coverage, lint coverage, and release docs.",
  "Accessibility-contract changes should keep source semantics, focus behavior, reduced-motion behavior, axe coverage, Lighthouse expectations, and release guidance aligned.",
  "Accessibility conformance changes should keep WCAG targets, assistive-technology review evidence, manual review expectations, release guidance, and PR review guidance aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "Add or update manual accessibility evidence when WCAG target coverage, assistive-technology review scope, screen reader semantics, or accessibility release evidence changes.",
]);

requireSnippets(".github/pull_request_template.md", [
  "Accessibility conformance impact was considered for WCAG alignment, manual assistive-technology review, and release evidence.",
]);

requireSnippets("docs/adr/README.md", ["ADR 0052: Add Accessibility Conformance Review Contract"]);

requireSnippets("CHANGELOG.md", [
  "Accessibility conformance review contract for WCAG 2.2 Level AA alignment, assistive-technology review planning, and release evidence",
]);

requireSnippets("docs/DESIGN_SYSTEM.md", [
  "## Accessibility And Motion",
  "Motion must respect `prefers-reduced-motion`.",
  "Every interactive control must be reachable by keyboard and have a visible focus ring.",
]);

console.log("- accessibility documentation checked");
console.log("- source semantics and style affordances checked");
console.log("- lint, browser, resilience, cross-browser, and release coverage checked");

if (failures.length > 0) {
  console.error("\nAccessibility contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Accessibility contract check passed.");

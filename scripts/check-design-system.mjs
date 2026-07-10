import { existsSync, readdirSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required design-system file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected design-system text: ${snippet}`);
    }
  }
}

function requireSnapshotNames(directory, expectedParts) {
  if (!existsSync(directory)) {
    failures.push(`missing visual snapshot directory: ${directory}`);
    return;
  }

  const snapshotNames = readdirSync(directory);

  for (const expectedPart of expectedParts) {
    if (!snapshotNames.some((name) => name.includes(expectedPart))) {
      failures.push(`${directory} is missing a visual snapshot containing: ${expectedPart}`);
    }
  }
}

function requireTokenizedThemeColors(file) {
  const content = readProjectFile(file);
  const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(|hsla?\s*\(/;
  let inThemeTokenBlock = false;
  let blockDepth = 0;

  content.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*:root\s*\{/.test(line)) {
      inThemeTokenBlock = true;
    }

    if (rawColorPattern.test(line) && !inThemeTokenBlock) {
      failures.push(
        `${file}:${index + 1} uses a hard-coded theme color outside token definitions; add a CSS custom property and consume it with var(...)`,
      );
    }

    if (inThemeTokenBlock) {
      blockDepth += (line.match(/\{/g) ?? []).length;
      blockDepth -= (line.match(/\}/g) ?? []).length;

      if (blockDepth <= 0) {
        inThemeTokenBlock = false;
        blockDepth = 0;
      }
    }
  });
}

console.log("Design system report");

requireSnippets("docs/DESIGN_SYSTEM.md", [
  "# Design System Contract",
  "## Product Posture",
  "## Token Layers",
  "## Component States",
  "## Accessibility And Motion",
  "## Protected Visual Surface",
  "## Change Process",
  "npm run design:check",
  "npm run test:e2e:visual",
  "npm run docs:screenshots",
]);

requireSnippets("src/styles.css", [
  "--color-text:",
  "--color-brand:",
  "--color-accent:",
  "--color-surface:",
  "--color-focus:",
  "--color-success:",
  "--color-success-border:",
  "--color-danger:",
  "--color-danger-border:",
  "--radius-card:",
  "--radius-control:",
  "--radius-pill:",
  "--shadow-panel:",
  "--space-page:",
  "--space-panel:",
  "--space-gap:",
  "@media (prefers-color-scheme: dark)",
  "@media (prefers-reduced-motion: reduce)",
  "button:focus-visible",
  "input:focus-visible",
  ".app-shell",
  ".practice-panel",
  ".stats-panel",
  ".brand-lockup",
  ".session-pill",
  ".session-pill.live",
  ".session-pill.saved",
  ".mode-switch button.active",
  ".staff-card::before",
  ".feedback.correct",
  ".feedback.wrong",
  ".answer-button:disabled",
  "@media (max-width: 940px)",
  "@media (max-width: 640px)",
]);

requireTokenizedThemeColors("src/styles.css");

requireSnippets("e2e/visual.spec.ts", [
  'test("matches the note-reading shell"',
  'test("matches the pitch-training shell"',
  'test("matches the brand accent controls"',
  'toHaveScreenshot("note-reading-shell.png"',
  'toHaveScreenshot("pitch-training-shell.png"',
  'toHaveScreenshot("brand-mode-switch.png"',
  'toHaveScreenshot("brand-primary-button.png"',
]);

requireSnippets("playwright.visual.config.ts", [
  'name: "visual-desktop-light"',
  'name: "visual-desktop-dark"',
  'name: "visual-mobile-light"',
  'name: "visual-mobile-dark"',
  'serviceWorkers: "block"',
]);

requireSnapshotNames("e2e/visual.spec.ts-snapshots", [
  "brand-mode-switch-visual-desktop-light",
  "brand-mode-switch-visual-desktop-dark",
  "brand-primary-button-visual-desktop-light",
  "brand-primary-button-visual-desktop-dark",
  "note-reading-shell-visual-desktop-light",
  "note-reading-shell-visual-desktop-dark",
  "note-reading-shell-visual-mobile-light",
  "note-reading-shell-visual-mobile-dark",
  "pitch-training-shell-visual-desktop-light",
  "pitch-training-shell-visual-desktop-dark",
  "pitch-training-shell-visual-mobile-light",
  "pitch-training-shell-visual-mobile-dark",
]);

console.log("- design-system documentation checked");
console.log("- CSS token and state contract checked");
console.log("- CSS theme color token usage checked");
console.log("- visual-regression coverage contract checked");

if (failures.length > 0) {
  console.error("\nDesign system check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Design system check passed.");

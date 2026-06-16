import { existsSync, readFileSync } from "node:fs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required i18n file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file} is missing expected i18n text: ${snippet}`);
    }
  }
}

console.log("Internationalization contract report");

requireSnippets("docs/I18N.md", [
  "# Internationalization And Localization Contract",
  "## Current Language Boundary",
  "## Locale Readiness Rules",
  "## Music-Learning Localization",
  "## Accessibility And Layout",
  "## Change Rules",
  "## Verification",
  "The current supported interface language is English.",
  'The root HTML document declares `lang="en"`.',
  "No translated UI, locale selector, remote translation service, or runtime locale negotiation is part of the current product scope.",
  "A second supported interface language requires a typed message catalog or equivalent central message layer before UI copy is translated.",
  "User-visible dates, numbers, percentages, durations, and list formatting should use reviewed `Intl.*` formatting when localization begins.",
  "Data identifiers should remain stable internal IDs; translated labels should be presentation-only.",
  "Right-to-left language support is not currently supported; adding it requires explicit layout, visual-regression, browser-support, and accessibility evidence.",
  "Run `npm run i18n:check` after language, locale, copy extraction, metadata-language, translation, notation-label, text-formatting, or locale-formatting changes.",
]);

requireSnippets("index.html", ['<html lang="en">']);

requireSnippets("package.json", [
  '"i18n:check": "node scripts/check-i18n-contract.mjs"',
  "npm run data:check && npm run i18n:check && npm run security:privacy",
]);

requireSnippets("README.md", ["[docs/I18N.md](docs/I18N.md)"]);

requireSnippets("CONTRIBUTING.md", [
  "For language, locale, translation, notation-label, text-formatting, or localization-readiness changes, keep [docs/I18N.md](docs/I18N.md) aligned and run the i18n contract check:",
  "npm run i18n:check",
  "Keep [docs/I18N.md](docs/I18N.md) aligned when changing language boundaries, copy extraction, translated labels, locale formatting, notation labels, right-to-left assumptions, or localization review evidence; run `npm run i18n:check` after i18n-sensitive changes.",
]);

requireSnippets(".github/pull_request_template.md", [
  "I18n/l10n impact was considered for language boundaries, translatable copy, notation labels, locale formatting, RTL assumptions, and layout growth.",
]);

requireSnippets("docs/PRODUCT_SCOPE.md", [
  "translated UI, locale selector, runtime locale negotiation, right-to-left layout, or localized music notation",
  "Update i18n/l10n guidance when language, locale, notation-label, or localization-readiness expectations change.",
]);

requireSnippets("docs/QUALITY.md", [
  "I18n/l10n docs and `npm run i18n:check` stay aligned when language boundaries, translated copy, notation labels, locale formatting, right-to-left assumptions, or localization review evidence changes.",
  "`docs/I18N.md` defines the current English-only language boundary, locale-readiness rules, music-learning localization constraints, accessibility/layout expectations, and localization change process.",
  '`npm run i18n:check` verifies language boundaries, `lang="en"`, future message ownership, locale formatting, layout, accessibility, data stability, privacy, release, and review guidance stay aligned.',
]);

requireSnippets("docs/RELEASE.md", [
  "Treat i18n/l10n results as release evidence when language boundaries, translated copy, notation labels, locale formatting, right-to-left assumptions, metadata language, or localization review evidence changes.",
  "Whether `npm run i18n:check` still proves English-only boundaries, future localization rules, accessibility, layout, data stability, privacy, and review guidance are aligned.",
]);

requireSnippets("docs/ARCHITECTURE.md", [
  "`docs/I18N.md` documents the current English-only language boundary, locale-readiness rules, music-learning localization constraints, accessibility/layout expectations, and localization change process.",
  "`scripts/check-i18n-contract.mjs` owns i18n/l10n drift checks for language boundaries, HTML language metadata, future message ownership, locale formatting, music notation labels, accessibility, layout, data stability, release guidance, and PR review guidance.",
  "I18n/l10n changes should keep language boundaries, translatable copy, notation labels, locale formatting, right-to-left assumptions, accessibility, layout, data stability, privacy, release guidance, and PR review guidance aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "i18n/l10n governance stays part of the foundation contract gate",
  "Add or update browser, visual, accessibility, and formatting evidence when language, locale, translated copy, notation labels, or right-to-left assumptions change.",
]);

requireSnippets("docs/ACCESSIBILITY.md", [
  "Localized copy must preserve accessible names, headings, live-region meaning, focus order, and keyboard workflows.",
]);

requireSnippets("docs/BROWSER_SUPPORT.md", [
  "Right-to-left layout and runtime locale negotiation are not part of the current browser support contract.",
]);

requireSnippets("docs/DATA_CONTRACT.md", [
  "Future localization must keep exported data identifiers stable and presentation-only labels separate from stored practice IDs.",
]);

requireSnippets("docs/PRIVACY.md", [
  "Future localization must not introduce remote translation services, locale analytics, cookies, or third-party scripts without privacy, security, runtime-surface, and release review.",
]);

requireSnippets("docs/adr/README.md", ["ADR 0053: Add I18n Readiness Contract"]);

requireSnippets("CHANGELOG.md", [
  "Internationalization and localization readiness contract with `docs/I18N.md` and `npm run i18n:check` for English-only boundaries, future locale strategy, notation labels, layout, accessibility, data stability, and review guidance",
]);

console.log("- language boundary and HTML lang checked");
console.log("- locale readiness, notation, accessibility, and data-stability guidance checked");
console.log("- governance, release, and review links checked");

if (failures.length > 0) {
  console.error("\nInternationalization contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Internationalization contract check passed.");

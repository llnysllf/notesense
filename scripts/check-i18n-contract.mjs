import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

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
    if (!includesContractSnippet(content, snippet)) {
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
]);

requireSnippets("docs/QUALITY.md", [
  "I18n/l10n docs and `npm run i18n:check` stay aligned when language boundaries, translated copy, notation labels, locale formatting, right-to-left assumptions, or localization review evidence changes.",
  '`npm run i18n:check` verifies language boundaries, `lang="en"`, future message ownership, locale formatting, layout, accessibility, data stability, privacy, release, and review guidance stay aligned.',
]);

requireSnippets("docs/RELEASE.md", [
  "Whether `npm run i18n:check` still proves English-only boundaries, future localization rules, accessibility, layout, data stability, privacy, and review guidance are aligned.",
]);

requireSnippets("docs/TESTING.md", ["i18n/l10n governance stays part of the foundation contract gate"]);

requireSnippets("docs/BROWSER_SUPPORT.md", [
  "Right-to-left layout and runtime locale negotiation are not part of the current browser support contract.",
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

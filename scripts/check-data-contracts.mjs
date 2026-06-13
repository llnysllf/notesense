import { readFileSync } from "node:fs";

const failures = [];

function readProjectFile(file) {
  return readFileSync(file, "utf8");
}

function requireSnippet(file, snippet) {
  const content = readProjectFile(file);

  if (!content.includes(snippet)) {
    failures.push(`${file} is missing expected data-contract text: ${snippet}`);
  }
}

function getStringConstant(file, name) {
  const content = readProjectFile(file);
  const match = new RegExp(`const\\s+${name}\\s+=\\s+"([^"]+)"`).exec(content);

  if (!match?.[1]) {
    failures.push(`${file} is missing string constant ${name}`);
    return "";
  }

  return match[1];
}

function getNumberConstant(file, name) {
  const content = readProjectFile(file);
  const match = new RegExp(`export\\s+const\\s+${name}\\s+=\\s+(\\d+)`).exec(content);

  if (!match?.[1]) {
    failures.push(`${file} is missing numeric export ${name}`);
    return "";
  }

  return match[1];
}

console.log("Data contract report");

const storageKey = getStringConstant("src/storage.ts", "STORAGE_KEY");
const legacyStorageKey = getStringConstant("src/storage.ts", "LEGACY_STORAGE_KEY");
const settingsStorageKey = getStringConstant("src/storage.ts", "SETTINGS_STORAGE_KEY");
const schemaVersion = getNumberConstant("shared/src/practiceData.ts", "DATA_EXPORT_SCHEMA_VERSION");
const sessionHistoryLimit = getNumberConstant("shared/src/practiceData.ts", "SESSION_HISTORY_LIMIT");

for (const key of [storageKey, legacyStorageKey, settingsStorageKey].filter(Boolean)) {
  requireSnippet("docs/DATA_CONTRACT.md", key);
  requireSnippet("docs/PRIVACY.md", key);
}

requireSnippet("docs/DATA_CONTRACT.md", `The current export schema version is \`${schemaVersion}\``);
requireSnippet("docs/DATA_CONTRACT.md", "notesense-progress-YYYY-MM-DD.json");
requireSnippet("docs/DATA_CONTRACT.md", "SESSION_HISTORY_LIMIT");
requireSnippet("docs/DATA_CONTRACT.md", "No analytics, telemetry, cookies, beacons, websockets, or background sync");

requireSnippet("docs/PRIVACY.md", `Export schema version is currently \`${schemaVersion}\`.`);
requireSnippet(
  "docs/PRIVACY.md",
  "The service worker cache stores reviewed static app assets only. It does not cache practice progress, exported data, or imported files.",
);
requireSnippet(
  "docs/PRIVACY.md",
  "No analytics, telemetry, advertising pixels, or third-party tracking scripts are included.",
);

for (const field of [
  "schemaVersion: 1",
  "exportedAt: string",
  "progress: PracticeProgress",
  "settings: PracticeSettings",
]) {
  requireSnippet("shared/src/types.ts", field);
}

for (const field of [
  "roundLength: RoundLength",
  "readingRange: ReadingRange",
  "adaptivePractice: boolean",
  "autoPlayPitch: boolean",
  "revealPitchAfterAnswer: boolean",
]) {
  requireSnippet("shared/src/types.ts", field);
}

for (const field of [
  "id: string",
  "mode: PracticeMode",
  "completedAt: string",
  "durationSeconds: number",
  "score: number",
  "attempts: number",
  "accuracy: number",
  "bestStreak: number",
]) {
  requireSnippet("shared/src/types.ts", field);
}

requireSnippet("shared/src/practiceData.ts", "parsedImport.schemaVersion !== DATA_EXPORT_SCHEMA_VERSION");
requireSnippet("shared/src/practiceData.ts", "normalizeProgress(parsedImport.progress, emptyProgress)");
requireSnippet("shared/src/practiceData.ts", "normalizeSettings(parsedImport.settings)");
requireSnippet("shared/src/practiceData.ts", `.slice(0, SESSION_HISTORY_LIMIT)`);
requireSnippet("shared/src/practiceData.ts", "notesense-progress-${dateStamp}.json");

requireSnippet("src/storage.ts", "window.localStorage.getItem(STORAGE_KEY)");
requireSnippet("src/storage.ts", "window.localStorage.getItem(LEGACY_STORAGE_KEY)");
requireSnippet("src/storage.ts", "window.localStorage.getItem(SETTINGS_STORAGE_KEY)");
requireSnippet("src/storage.ts", "window.localStorage.setItem(STORAGE_KEY");
requireSnippet("src/storage.ts", "window.localStorage.setItem(SETTINGS_STORAGE_KEY");

for (const testName of [
  'test("exports local practice data"',
  'test("imports local practice data"',
  'test("rejects invalid imported practice data"',
  'test("surfaces storage failures without crashing"',
]) {
  requireSnippet("e2e/app.spec.ts", testName);
}

requireSnippet(
  "docs/ARCHITECTURE.md",
  "`docs/DATA_CONTRACT.md` documents browser storage keys, export schema, import normalization, and future sync constraints.",
);
requireSnippet(
  "docs/ARCHITECTURE.md",
  "`scripts/check-data-contracts.mjs` owns data-contract drift checks for storage keys, shared export shape, privacy docs, and browser coverage.",
);
requireSnippet("docs/THREAT_MODEL.md", "| Practice progress          | Browser LocalStorage");
requireSnippet("docs/THREAT_MODEL.md", "| Exported JSON              | User-selected download location");
requireSnippet(
  "docs/RELEASE.md",
  "Treat data-contract results as release evidence when storage keys, export schema, import normalization, privacy boundaries, or future sync assumptions change.",
);

console.log(`- storage keys checked: ${[storageKey, legacyStorageKey, settingsStorageKey].filter(Boolean).length}`);
console.log(`- export schema version checked: ${schemaVersion}`);
console.log(`- session history limit checked: ${sessionHistoryLimit}`);
console.log("- data docs and browser coverage checked");

if (failures.length > 0) {
  console.error("\nData contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Data contract check passed.");

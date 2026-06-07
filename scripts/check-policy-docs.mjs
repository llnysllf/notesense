import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  ".github/pull_request_template.md",
  "docs/ARCHITECTURE.md",
  "docs/PRIVACY.md",
  "docs/QUALITY.md",
  "docs/RELEASE.md",
];

const requiredSnippets = [
  {
    file: "README.md",
    snippets: [
      "Privacy and data handling: [docs/PRIVACY.md](docs/PRIVACY.md)",
      "Security policy: [SECURITY.md](SECURITY.md)",
      "`npm run docs:check` verifies that privacy, security, release, architecture, and contribution docs stay linked and aligned.",
    ],
  },
  {
    file: "SECURITY.md",
    snippets: [
      "Privacy and data handling expectations live in [docs/PRIVACY.md](docs/PRIVACY.md).",
      "Treat import/export parsing as an untrusted input boundary.",
      "Treat future account, sync, and backend features as security-sensitive changes requiring tests and review.",
    ],
  },
  {
    file: "CONTRIBUTING.md",
    snippets: [
      "Run the full local gate:",
      "npm run verify",
      "Update [docs/PRIVACY.md](docs/PRIVACY.md) when a change affects account data, sync, storage, import/export, analytics, or network behavior.",
    ],
  },
  {
    file: ".github/pull_request_template.md",
    snippets: [
      "Privacy/data handling impact was considered for storage, import/export, analytics, future auth, future sync, and network behavior.",
    ],
  },
  {
    file: "docs/PRIVACY.md",
    snippets: [
      "No analytics, telemetry, advertising pixels, or third-party tracking scripts are included.",
      "Practice progress, note stats, pitch stats, and session history are saved in LocalStorage under `notesense.progress.v2`.",
      "Practice settings are saved in LocalStorage under `notesense.settings.v3`.",
      "Older local progress may be read from `notesense.progress.v1`",
      "Exported JSON files are created only when the learner chooses **Export data**.",
      "Imported files are parsed in the browser and normalized before they replace local progress.",
      "Future sign-in, cloud sync, backend APIs, or hosted storage must be designed as explicit privacy-impacting changes.",
      "Last reviewed: 2026-06-07",
    ],
  },
  {
    file: "docs/QUALITY.md",
    snippets: [
      "Privacy and data-handling docs stay aligned with local storage, import/export, analytics, network, auth, and sync behavior.",
      "`npm run docs:check` verifies that policy and governance docs remain linked and aligned.",
    ],
  },
  {
    file: "docs/RELEASE.md",
    snippets: [
      "Treat privacy and data-handling docs as release evidence when storage, import/export, analytics, network, account, or sync behavior changes.",
      "Whether `npm run docs:check` passes.",
    ],
  },
  {
    file: "docs/ARCHITECTURE.md",
    snippets: [
      "`docs/PRIVACY.md` documents the current local-first privacy and data-handling boundary.",
      "Privacy expectations must stay aligned with local storage, import/export, future auth, sync, analytics, and network behavior.",
    ],
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readProjectFile(file) {
  assert(existsSync(file), `Missing required policy document: ${file}`);
  return readFileSync(file, "utf8");
}

console.log("Policy docs report");

for (const file of requiredFiles) {
  readProjectFile(file);
  console.log(`- ${file}: present`);
}

for (const { file, snippets } of requiredSnippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    assert(content.includes(snippet), `${file} is missing expected policy text: ${snippet}`);
  }
}

console.log("Policy docs passed.");

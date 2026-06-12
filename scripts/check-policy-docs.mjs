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
  "docs/THREAT_MODEL.md",
  "docs/BACKEND_READINESS.md",
];

const requiredSnippets = [
  {
    file: "README.md",
    snippets: [
      "Privacy and data handling: [docs/PRIVACY.md](docs/PRIVACY.md)",
      "Threat model: [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)",
      "Backend readiness: [docs/BACKEND_READINESS.md](docs/BACKEND_READINESS.md)",
      "Security policy: [SECURITY.md](SECURITY.md)",
      "`npm run docs:check` verifies that privacy, security, release, architecture, and contribution docs stay linked and aligned, and that local Markdown links plus documented npm scripts still resolve.",
      "`npm run runtime:check` verifies the built app and source stay inside the documented local-first runtime boundary.",
      "`npm run security:workflows` verifies that GitHub Actions references are pinned to immutable commit SHAs and that workflow token permissions stay least-privilege.",
      "Dependency Review scans pull requests for high-severity vulnerable dependency changes and invalid license changes before merge.",
      "`npm run ops:repository` verifies branch protection, required checks, repository security settings, vulnerability alerts, Pages, and active workflows against the reviewed governance policy.",
    ],
  },
  {
    file: "SECURITY.md",
    snippets: [
      "Privacy and data handling expectations live in [docs/PRIVACY.md](docs/PRIVACY.md).",
      "Future account, sync, and backend work should also follow [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) and [docs/BACKEND_READINESS.md](docs/BACKEND_READINESS.md).",
      "Keep GitHub Actions pinned to reviewed commit SHAs with least-privilege token permissions; run `npm run security:workflows` after workflow edits.",
      "Treat Dependency Review failures as release-blocking for pull requests that change dependencies.",
      "Run `npm run ops:repository` after repository security, branch protection, required-check, Pages, or workflow-activation changes.",
      "Treat import/export parsing as an untrusted input boundary.",
      "Treat future account, sync, and backend features as security-sensitive changes requiring tests and review.",
      "Do not connect the browser app directly to a database; future persistence must go through a reviewed backend API.",
      "Run `npm run security:policy` after a Pages build when HTML shell, Vite build, runtime API, or asset-category behavior changes.",
    ],
  },
  {
    file: "CONTRIBUTING.md",
    snippets: [
      "Run the full local gate:",
      "npm run verify",
      "Keep dependency changes passing Dependency Review before merge.",
      "Keep workflow action refs pinned to full commit SHAs, document the source version tag in a comment, and keep workflow token permissions least-privilege.",
      "Run `npm run ops:repository` after branch protection, repository security, Pages, required-check, or workflow-activation changes.",
      "Do not add sign-in, sync, PostgreSQL, or AWS services without updating the threat model and backend-readiness docs first.",
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
      "`npm run runtime:check` rejects unreviewed client network APIs, cookies, telemetry beacons, websockets, and unapproved external URLs.",
      "The service worker cache stores reviewed static app assets only. It does not cache practice progress, exported data, or imported files.",
      "The service worker is generated at build time for static offline use. It does not use background sync, push notifications, analytics, or custom runtime API caching.",
      "Practice progress, note stats, pitch stats, and session history are saved in LocalStorage under `notesense.progress.v2`.",
      "Practice settings are saved in LocalStorage under `notesense.settings.v3`.",
      "Older local progress may be read from `notesense.progress.v1`",
      "Exported JSON files are created only when the learner chooses **Export data**.",
      "Imported files are parsed in the browser and normalized before they replace local progress.",
      "Future sign-in, cloud sync, backend APIs, or hosted storage must be designed as explicit privacy-impacting changes.",
      "Last reviewed: 2026-06-11",
    ],
  },
  {
    file: "docs/QUALITY.md",
    snippets: [
      "Privacy and data-handling docs stay aligned with local storage, import/export, analytics, network, auth, and sync behavior.",
      "Threat model and backend-readiness docs stay aligned before account, API, database, sync, or cloud infrastructure work begins.",
      "Documentation links, anchors, and documented npm script references stay resolvable.",
      "Runtime surface checks pass for client network APIs, cookies, telemetry beacons, websockets, and external URLs.",
      "Built HTML security policy checks pass before release.",
      "Dependency Review passes for pull requests that introduce dependency or lockfile changes.",
      "GitHub Actions workflow references are pinned to full commit SHAs with source-version comments, and workflow token permissions stay least-privilege.",
      "GitHub repository governance checks pass after branch protection, repository security, Pages, required-check, or workflow-activation changes.",
      "`npm run docs:check` verifies that policy and governance docs remain linked and aligned.",
      "`npm run docs:check` also validates local Markdown links, anchors, and documented npm script references.",
      "`npm run security:policy` verifies the built HTML Content Security Policy after `npm run build:pages`.",
      "`npm run runtime:check` scans client source and built Pages HTML after `npm run build:pages`.",
    ],
  },
  {
    file: "docs/RELEASE.md",
    snippets: [
      "Treat privacy and data-handling docs as release evidence when storage, import/export, analytics, network, account, or sync behavior changes.",
      "Treat threat-model and backend-readiness docs as release evidence before auth, API, database, sync, PostgreSQL, or cloud infrastructure changes.",
      "Treat Dependency Review results as pull-request supply-chain release evidence when dependencies or lockfiles change.",
      "Treat workflow action pinning and token-permission results as supply-chain release evidence when GitHub Actions workflows change.",
      "Treat repository governance results as operational release evidence when branch protection, required checks, repository security settings, Pages, or workflow activation changes.",
      "Treat documentation integrity results as release evidence when docs, file paths, anchors, or npm scripts change.",
      "Treat runtime surface results as release evidence when client APIs, URLs, analytics, network, auth, or sync behavior changes.",
      "Treat built browser security policy results as release evidence when HTML shell, Vite build, runtime APIs, or asset categories change.",
      "Whether `npm run docs:check` passes.",
      "Whether `npm run security:policy` still passes after the Pages build.",
      "Whether `npm run runtime:check` passes after a Pages build.",
    ],
  },
  {
    file: "docs/ARCHITECTURE.md",
    snippets: [
      "`docs/PRIVACY.md` documents the current local-first privacy and data-handling boundary.",
      "`docs/THREAT_MODEL.md` documents current and future security boundaries before account or sync work begins.",
      "`docs/BACKEND_READINESS.md` documents the service, API, data-model, sync, and PostgreSQL path for future backend work.",
      "Privacy expectations must stay aligned with local storage, import/export, future auth, sync, analytics, and network behavior.",
      "Dependency Review is part of pull-request supply-chain readiness for dependency and lockfile changes.",
      "`vite.config.ts` injects the production Content Security Policy meta tag during build.",
      "`scripts/check-github-repository.mjs` owns GitHub repository governance drift detection for branch protection, required checks, security settings, Pages, vulnerability alerts, and active workflows.",
      "`scripts/check-workflow-actions.mjs` owns GitHub Actions reference pinning policy enforcement.",
      "`scripts/check-workflow-permissions.mjs` owns GitHub Actions token-permission policy enforcement.",
      "`scripts/check-security-policy.mjs` owns built HTML security policy verification.",
      "`scripts/verify-live-pages.mjs` owns post-deploy public GitHub Pages, metadata asset, service worker, Workbox runtime, and security policy verification.",
      "`scripts/check-doc-integrity.mjs` owns local Markdown link, anchor, and documented npm script reference checks.",
      "`scripts/check-pwa-artifacts.mjs` owns generated service worker and static precache verification.",
      "`scripts/check-runtime-surface.mjs` owns client runtime/network surface checks against the local-first privacy boundary.",
      "Client runtime surface checks should reject network, tracking, cookie, websocket, or external URL drift unless the change is intentional and documented.",
    ],
  },
  {
    file: "docs/THREAT_MODEL.md",
    snippets: [
      "The browser app must never connect directly to PostgreSQL or any other database.",
      "Future account or cloud sync work must address:",
      "No direct browser connection to PostgreSQL or any database.",
    ],
  },
  {
    file: "docs/BACKEND_READINESS.md",
    snippets: [
      "React app -> Backend API -> Database",
      "PostgreSQL is a good future fit if NoteSense needs relational history, analytics, exports, deletion workflows, and durable backups.",
      "All endpoints must require authorization once accounts exist.",
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

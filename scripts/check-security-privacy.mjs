import { existsSync, readFileSync } from "node:fs";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

const failures = [];

function readProjectFile(file) {
  if (!existsSync(file)) {
    failures.push(`missing required security/privacy file: ${file}`);
    return "";
  }

  return readFileSync(file, "utf8");
}

function requireSnippets(file, snippets) {
  const content = readProjectFile(file);

  for (const snippet of snippets) {
    if (!includesContractSnippet(content, snippet)) {
      failures.push(`${file} is missing expected security/privacy text: ${snippet}`);
    }
  }
}

console.log("Security/privacy contract report");

requireSnippets("docs/SECURITY_PRIVACY.md", [
  "# Security And Privacy Contract",
  "## Product Standard",
  "## Current Protected Surface",
  "## Runtime And Build Boundaries",
  "## Future Auth And Sync Rules",
  "## Review And Release Evidence",
  "## Change Rules",
  "## Verification",
  "Practice progress, settings, session history, imports, and exports are user-private local data unless a future reviewed backend design says otherwise.",
  "`npm run security:supply-chain` verifies high-severity dependency advisories, lockfile source/integrity, dependency licenses, SPDX SBOM generation, workflow action pinning, workflow permissions, and workflow operations.",
  "Run `npm run security:privacy` after privacy, security, data-contract, runtime-surface, CSP, PWA, import/export, storage, telemetry, analytics, auth, sync, backend-readiness, threat-model, or security-doc changes.",
]);

requireSnippets("package.json", [
  '"security:privacy": "node scripts/check-security-privacy.mjs"',
  "npm run dependencies:check && npm run legal:check && npm run data:check && npm run i18n:check && npm run security:privacy && npm run architecture:check",
  '"data:check": "node scripts/check-data-contracts.mjs"',
  '"runtime:check": "node scripts/check-runtime-surface.mjs"',
  '"security:policy": "node scripts/check-security-policy.mjs"',
  '"pwa:check": "node scripts/check-pwa-artifacts.mjs"',
  '"security:sbom": "node scripts/check-sbom.mjs"',
  '"security:supply-chain": "npm run security:audit && npm run security:lockfile && npm run compliance:licenses && npm run security:sbom && npm run security:workflows"',
  '"verify": "npm run security:supply-chain && npm run check && npm run test:e2e:resilience && npm run build:pages && npm run security:policy && npm run metadata:check && npm run pwa:check && npm run runtime:check && npm run perf:budget && npm run test:e2e:pages"',
]);

requireSnippets("SECURITY.md", [
  "Security/privacy readiness expectations live in [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md).",
  "Run `npm run security:privacy` after privacy, security, data-contract, runtime-surface, CSP, PWA, import/export, storage, telemetry, analytics, auth, sync, backend-readiness, threat-model, or security-doc changes.",
]);

requireSnippets("docs/PRIVACY.md", [
  "Security/privacy readiness expectations live in [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md).",
  "No analytics, telemetry, advertising pixels, or third-party tracking scripts are included.",
  "`npm run runtime:check` rejects unreviewed client network APIs, cookies, telemetry beacons, websockets, and unapproved external URLs.",
  "The service worker cache stores reviewed static app assets only. It does not cache practice progress, exported data, or imported files.",
]);

requireSnippets("docs/THREAT_MODEL.md", [
  "Security/privacy readiness expectations live in [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md).",
  "No analytics, telemetry, advertising, cookies, or third-party scripts.",
  "Accidental network, cookie, or telemetry behavior",
  "Runtime-surface gate blocks unreviewed fetch, XHR, beacons, websockets, cookies, and external URLs",
  "No direct browser connection to PostgreSQL or any database.",
]);

requireSnippets("docs/BACKEND_READINESS.md", [
  "Security/privacy readiness expectations live in [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md).",
  "No backend is deployed.",
  "Local anonymous mode still works.",
]);

requireSnippets("docs/DATA_CONTRACT.md", ["No analytics, telemetry, cookies, beacons, websockets, or background sync"]);

requireSnippets("scripts/check-runtime-surface.mjs", [
  "client runtime must not add required network fetches without privacy review",
  "client runtime must not add telemetry beacons",
  "client runtime must not read or write cookies",
  "client runtime must not add worker script imports without review",
]);

requireSnippets("scripts/check-security-policy.mjs", [
  "connect-src 'none'",
  "Built HTML must not contain inline script tags",
  "Built HTML must not contain inline event handlers",
]);

requireSnippets("scripts/check-pwa-artifacts.mjs", [
  "service worker must not reference external URLs",
  "service worker must not add background sync",
  "service worker must not add push notifications",
  "Service worker must import the local Workbox runtime",
]);

requireSnippets("CONTRIBUTING.md", [
  "For security/privacy, runtime-surface, CSP, PWA, import/export, storage, telemetry, analytics, auth, sync, backend-readiness, threat-model, or security-doc changes, keep [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) aligned and run the security/privacy contract check:",
  "npm run security:privacy",
  "Keep [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) aligned when privacy, security, data-contract, runtime-surface, CSP, PWA, import/export, storage, telemetry, analytics, auth, sync, backend-readiness, threat-model, or security-doc expectations change; run `npm run security:privacy` after security/privacy-sensitive changes.",
]);

requireSnippets("docs/QUALITY.md", [
  "Security/privacy docs and `npm run security:privacy` stay aligned when local-first privacy, import/export trust, runtime/network boundaries, CSP, PWA behavior, future auth/sync, backend readiness, telemetry, analytics, or security posture changes.",
  "For security/privacy feedback:",
  "npm run security:privacy",
]);

requireSnippets("docs/RELEASE.md", [
  "Whether `npm run security:privacy` still proves privacy docs, security policy, threat model, backend readiness, data contract, runtime-surface, CSP, PWA, supply-chain, and review/release guidance are aligned.",
]);

requireSnippets("docs/TESTING.md", [
  "npm run security:privacy",
  "security/privacy governance stays part of the foundation contract gate",
]);

requireSnippets("docs/adr/README.md", ["ADR 0043: Add Security And Privacy Contract"]);

requireSnippets("CHANGELOG.md", [
  "Security/privacy contract with `docs/SECURITY_PRIVACY.md` and `npm run security:privacy` for local-first privacy, import/export trust, runtime/network boundaries, CSP, PWA behavior, future auth/sync, backend readiness, and review/release evidence",
]);

console.log("- privacy docs, threat model, and backend readiness checked");
console.log("- runtime, CSP, PWA, data, and supply-chain controls checked");
console.log("- security/privacy docs and governance links checked");

if (failures.length > 0) {
  console.error("\nSecurity/privacy contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security/privacy contract check passed.");

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { evaluateAuditReport } from "./lib/audit-policy.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}

const lockfile = readJson("../package-lock.json");
const policy = readJson("../config/npm-audit-exceptions.json");
const audit = spawnSync("npm", ["audit", "--audit-level=high", "--json"], {
  encoding: "utf8",
});

if (audit.error) {
  console.error(`npm audit could not start: ${audit.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error("npm audit did not return a valid JSON report.");
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

if (report.error) {
  console.error(`npm audit failed: ${report.error.summary ?? report.error.message ?? "unknown error"}`);
  process.exit(1);
}

const result = evaluateAuditReport(report, lockfile, policy);

for (const [name] of result.ignored) {
  console.warn(`- accepted temporary dev-only audit exception: ${name}`);
}

if (result.blocked.length > 0) {
  console.error("\nBlocking npm audit findings:");
  for (const [name, vulnerability] of result.blocked) {
    console.error(`- ${name}: ${vulnerability.severity}`);
  }
  process.exit(1);
}

console.log(
  result.ignored.length > 0
    ? `npm audit passed with ${result.ignored.length} time-bound dev-only exception(s).`
    : "npm audit passed with no high or critical findings.",
);

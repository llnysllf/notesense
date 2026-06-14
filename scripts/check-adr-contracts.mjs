import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ADR_DIR = "docs/adr";
const INDEX_FILE = "docs/adr/README.md";
const VALID_STATUSES = new Set(["Proposed", "Accepted", "Deprecated", "Superseded"]);
const REQUIRED_SECTIONS = ["## Status", "## Context", "## Decision", "## Consequences"];
const ADR_FILENAME_PATTERN = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

const failures = [];

function readProjectFile(file) {
  return readFileSync(file, "utf8");
}

function requireSnippet(file, content, snippet) {
  if (!content.includes(snippet)) {
    failures.push(`${file} is missing expected ADR text: ${snippet}`);
  }
}

function getAdrFiles() {
  return readdirSync(ADR_DIR)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort();
}

function parseAdr(file) {
  const content = readProjectFile(join(ADR_DIR, file));
  const filenameMatch = ADR_FILENAME_PATTERN.exec(file);

  if (!filenameMatch?.[1]) {
    failures.push(`${ADR_DIR}/${file} must use NNNN-short-title.md naming`);
    return null;
  }

  const headingMatch = /^# ADR (\d{4}): (.+)$/m.exec(content);
  if (!headingMatch?.[1] || !headingMatch[2]) {
    failures.push(`${ADR_DIR}/${file} must start with "# ADR NNNN: Title"`);
    return null;
  }

  const number = filenameMatch[1];
  const headingNumber = headingMatch[1];
  const title = headingMatch[2].trim();

  if (number !== headingNumber) {
    failures.push(`${ADR_DIR}/${file} filename number ${number} does not match heading number ${headingNumber}`);
  }

  for (const section of REQUIRED_SECTIONS) {
    requireSnippet(`${ADR_DIR}/${file}`, content, section);
  }

  const statusMatch = /## Status\s+([A-Za-z]+)/m.exec(content);
  const status = statusMatch?.[1] ?? "";

  if (!VALID_STATUSES.has(status)) {
    failures.push(`${ADR_DIR}/${file} has unsupported ADR status: ${status || "missing"}`);
  }

  return { file, number, title, status };
}

console.log("ADR contract report");

const indexContent = readProjectFile(INDEX_FILE);
requireSnippet(INDEX_FILE, indexContent, "# Architecture Decision Records");
requireSnippet(INDEX_FILE, indexContent, "## Process");
requireSnippet(INDEX_FILE, indexContent, "## Index");
requireSnippet(INDEX_FILE, indexContent, "`npm run adr:check` verifies ADR numbering");

const adrFiles = getAdrFiles();
const adrs = adrFiles.map(parseAdr).filter(Boolean);
const numbers = new Set();

for (const adr of adrs) {
  if (numbers.has(adr.number)) {
    failures.push(`duplicate ADR number found: ${adr.number}`);
  }

  numbers.add(adr.number);
}

for (let index = 0; index < adrs.length; index += 1) {
  const expectedNumber = String(index + 1).padStart(4, "0");
  const actualNumber = adrs[index]?.number;

  if (actualNumber !== expectedNumber) {
    failures.push(`expected ADR ${expectedNumber} but found ${actualNumber ?? "missing"}`);
  }
}

for (const adr of adrs) {
  const indexLine = `- [ADR ${adr.number}: ${adr.title}](${adr.file}) - ${adr.status}`;
  requireSnippet(INDEX_FILE, indexContent, indexLine);
}

requireSnippet("package.json", readProjectFile("package.json"), '"adr:check": "node scripts/check-adr-contracts.mjs"');
requireSnippet(
  "package.json",
  readProjectFile("package.json"),
  "npm run docs:check && npm run adr:check && npm run product:check && npm run data:check",
);

requireSnippet(
  "README.md",
  readProjectFile("README.md"),
  "Architecture decision records: [docs/adr/README.md](docs/adr/README.md)",
);
requireSnippet("README.md", readProjectFile("README.md"), "Run the ADR governance check:");
requireSnippet("README.md", readProjectFile("README.md"), "npm run adr:check");

console.log(`- ADR files checked: ${adrs.length}`);
console.log(`- ADR statuses checked: ${adrs.length}`);
console.log("- ADR index links checked");

if (failures.length > 0) {
  console.error("\nADR contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("ADR contract check passed.");

import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const changelog = readFileSync("CHANGELOG.md", "utf8");
const failures = [];

const allowedSections = new Set(["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"]);

function getLineNumber(index) {
  return changelog.slice(0, index).split("\n").length;
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function getReleaseHeadings() {
  return [...changelog.matchAll(/^## \[([^\]]+)](?:\s+[—-]\s+(\d{4}-\d{2}-\d{2}))?\s*$/gm)].map((match) => ({
    date: match[2],
    index: match.index ?? 0,
    line: getLineNumber(match.index ?? 0),
    version: match[1] ?? "",
  }));
}

function compareVersionsDesc(a, b) {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = (bParts[index] ?? 0) - (aParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function getSectionBody(startIndex, endIndex) {
  return changelog.slice(startIndex, endIndex).trim();
}

console.log("Release notes report");

assert(changelog.startsWith("# Changelog\n"), "CHANGELOG.md must start with # Changelog");
assert(changelog.includes("Keep a Changelog"), "CHANGELOG.md must cite Keep a Changelog");
assert(changelog.includes("semantic versioning"), "CHANGELOG.md must cite semantic versioning");

const releaseHeadings = getReleaseHeadings();
const unreleased = releaseHeadings.find(({ version }) => version === "Unreleased");
assert(Boolean(unreleased), "CHANGELOG.md must include an [Unreleased] section");

if (unreleased && releaseHeadings[0]?.version !== "Unreleased") {
  failures.push("[Unreleased] must be the first release section");
}

const currentVersion = packageJson.version;
const currentRelease = releaseHeadings.find(({ version }) => version === currentVersion);
assert(Boolean(currentRelease), `CHANGELOG.md must include a section for package.json version ${currentVersion}`);

const releasedHeadings = releaseHeadings.filter(({ version }) => version !== "Unreleased");
const seenVersions = new Set();

for (const heading of releasedHeadings) {
  assert(/^\d+\.\d+\.\d+$/.test(heading.version), `line ${heading.line}: release heading must use semver`);
  assert(Boolean(heading.date), `line ${heading.line}: release heading must include an ISO release date`);

  if (seenVersions.has(heading.version)) {
    failures.push(`line ${heading.line}: duplicate release heading ${heading.version}`);
  }

  seenVersions.add(heading.version);
}

const sortedVersions = [...releasedHeadings].sort((a, b) => compareVersionsDesc(a.version, b.version));
for (const [index, heading] of releasedHeadings.entries()) {
  const sortedHeading = sortedVersions[index];
  if (sortedHeading && sortedHeading.version !== heading.version) {
    failures.push("release headings must be ordered newest to oldest");
    break;
  }
}

for (const [index, heading] of releaseHeadings.entries()) {
  const nextHeading = releaseHeadings[index + 1];
  const body = getSectionBody(heading.index, nextHeading?.index ?? changelog.length);
  const subsections = [...body.matchAll(/^### ([^\n]+)$/gm)].map((match) => ({
    line: getLineNumber(heading.index + (match.index ?? 0)),
    title: match[1] ?? "",
  }));

  if (heading.version === "Unreleased") {
    assert(subsections.length > 0, "[Unreleased] must include at least one Keep a Changelog category");
    assert(/^- /m.test(body), "[Unreleased] must include at least one bullet describing pending changes");
  }

  for (const subsection of subsections) {
    assert(
      allowedSections.has(subsection.title),
      `line ${subsection.line}: unsupported changelog category ${subsection.title}`,
    );
  }
}

console.log(`- package version checked: ${currentVersion}`);
console.log(`- release sections checked: ${releaseHeadings.length}`);
console.log(`- released versions checked: ${releasedHeadings.length}`);

if (failures.length > 0) {
  console.error("\nRelease notes check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release notes check passed.");

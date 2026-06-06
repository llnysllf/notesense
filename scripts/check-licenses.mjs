import { readFileSync } from "node:fs";

const LOCKFILE_PATH = "package-lock.json";

const allowedLicenses = new Set([
  "Apache-2.0",
  "BlueOak-1.0.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC-BY-4.0",
  "CC0-1.0",
  "ISC",
  "MIT",
  "MPL-2.0",
  "Python-2.0",
]);

const deniedLicensePattern = /\b(?:AGPL|GPL|LGPL|SSPL)\b/i;

function readLockfile() {
  return JSON.parse(readFileSync(LOCKFILE_PATH, "utf8"));
}

function getPackageLabel(path, packageData) {
  if (packageData.name) {
    return `${packageData.name} (${path})`;
  }

  return path.replace(/^node_modules\//, "");
}

function getLicenseAlternatives(licenseExpression) {
  return licenseExpression
    .replace(/[()]/g, "")
    .split(/\s+OR\s+/i)
    .map((alternative) =>
      alternative
        .split(/\s+AND\s+/i)
        .map((license) => license.trim())
        .filter(Boolean),
    )
    .filter((licenses) => licenses.length > 0);
}

function isAllowedLicenseExpression(licenseExpression) {
  if (deniedLicensePattern.test(licenseExpression)) {
    return false;
  }

  return getLicenseAlternatives(licenseExpression).some((alternative) =>
    alternative.every((license) => allowedLicenses.has(license)),
  );
}

const lockfile = readLockfile();
const packageEntries = Object.entries(lockfile.packages ?? {}).filter(([path]) => path !== "");
const failures = [];
const licenseCounts = new Map();

for (const [path, packageData] of packageEntries) {
  const packageLabel = getPackageLabel(path, packageData);
  const license = packageData.license;

  if (typeof license !== "string" || license.trim().length === 0) {
    failures.push(`${packageLabel}: missing license metadata`);
    continue;
  }

  const normalizedLicense = license.trim();
  licenseCounts.set(normalizedLicense, (licenseCounts.get(normalizedLicense) ?? 0) + 1);

  if (!isAllowedLicenseExpression(normalizedLicense)) {
    failures.push(`${packageLabel}: license "${normalizedLicense}" is not in the approved policy`);
  }
}

console.log("Dependency license report");
console.log(`- packages checked: ${packageEntries.length}`);

for (const [license, count] of [...licenseCounts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`- ${license}: ${count}`);
}

if (failures.length > 0) {
  console.error("\nLicense compliance failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("License compliance passed.");

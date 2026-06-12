import { readFileSync } from "node:fs";

const PACKAGE_JSON_PATH = "package.json";
const LOCKFILE_PATH = "package-lock.json";
const EXPECTED_LOCKFILE_VERSION = 3;
const EXPECTED_REGISTRY_HOST = "registry.npmjs.org";
const EXPECTED_INTEGRITY_PATTERN = /^sha512-[A-Za-z0-9+/=]+$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function getPackageManagerMajor(packageManager) {
  const match = /^npm@(\d+)\./.exec(packageManager);
  return match ? Number(match[1]) : undefined;
}

function getObjectEntries(value) {
  return Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b));
}

function hasSameEntries(left, right) {
  const leftEntries = getObjectEntries(left);
  const rightEntries = getObjectEntries(right);

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([leftKey, leftValue], index) => {
    const [rightKey, rightValue] = rightEntries[index] ?? [];
    return leftKey === rightKey && leftValue === rightValue;
  });
}

function validateRegistryTarball(resolved) {
  let url;

  try {
    url = new URL(resolved);
  } catch {
    return "must be a valid URL";
  }

  if (url.protocol !== "https:") {
    return "must use https";
  }

  if (url.hostname !== EXPECTED_REGISTRY_HOST) {
    return `must resolve from ${EXPECTED_REGISTRY_HOST}`;
  }

  if (!url.pathname.endsWith(".tgz")) {
    return "must point to a registry tarball";
  }

  return undefined;
}

function validateIntegrity(integrity) {
  const tokens = integrity.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return false;
  }

  return tokens.every((token) => EXPECTED_INTEGRITY_PATTERN.test(token));
}

const packageJson = readJson(PACKAGE_JSON_PATH);
const lockfile = readJson(LOCKFILE_PATH);
const rootPackage = assertObject(lockfile.packages?.[""], 'package-lock root package entry ""');
const packageEntries = Object.entries(assertObject(lockfile.packages, "package-lock packages")).filter(
  ([path]) => path !== "",
);
const failures = [];

if (lockfile.lockfileVersion !== EXPECTED_LOCKFILE_VERSION) {
  failures.push(
    `package-lock.json must use lockfileVersion ${EXPECTED_LOCKFILE_VERSION}; found ${String(
      lockfile.lockfileVersion,
    )}`,
  );
}

if (lockfile.requires !== true) {
  failures.push("package-lock.json must keep requires: true");
}

if (rootPackage.name !== packageJson.name) {
  failures.push(`lockfile root name must match package.json name "${packageJson.name}"`);
}

if (rootPackage.version !== packageJson.version) {
  failures.push(`lockfile root version must match package.json version "${packageJson.version}"`);
}

if (!hasSameEntries(rootPackage.dependencies, packageJson.dependencies)) {
  failures.push("lockfile root dependencies must match package.json dependencies");
}

if (!hasSameEntries(rootPackage.devDependencies, packageJson.devDependencies)) {
  failures.push("lockfile root devDependencies must match package.json devDependencies");
}

if (!hasSameEntries(rootPackage.engines, packageJson.engines)) {
  failures.push("lockfile root engines must match package.json engines");
}

const npmMajor = getPackageManagerMajor(packageJson.packageManager);
if (npmMajor !== 10) {
  failures.push("packageManager must stay pinned to an npm 10.x release for lockfile v3 compatibility");
}

const packageManagerCounts = {
  packages: 0,
  registryTarballs: 0,
  sha512Integrity: 0,
};

for (const [path, packageData] of packageEntries) {
  packageManagerCounts.packages += 1;

  if (!path.startsWith("node_modules/")) {
    failures.push(`${path}: package path must stay under node_modules`);
  }

  if (packageData.link === true) {
    failures.push(`${path}: link dependencies are not allowed in the committed lockfile`);
  }

  if (typeof packageData.version !== "string" || packageData.version.trim().length === 0) {
    failures.push(`${path}: missing package version`);
  }

  if (typeof packageData.resolved !== "string" || packageData.resolved.trim().length === 0) {
    failures.push(`${path}: missing resolved registry tarball`);
  } else {
    const resolvedFailure = validateRegistryTarball(packageData.resolved);
    if (resolvedFailure) {
      failures.push(`${path}: resolved ${resolvedFailure}`);
    } else {
      packageManagerCounts.registryTarballs += 1;
    }
  }

  if (typeof packageData.integrity !== "string" || packageData.integrity.trim().length === 0) {
    failures.push(`${path}: missing integrity hash`);
  } else if (!validateIntegrity(packageData.integrity)) {
    failures.push(`${path}: integrity must contain sha512 SRI token(s)`);
  } else {
    packageManagerCounts.sha512Integrity += 1;
  }
}

console.log("Lockfile supply-chain report");
console.log(`- lockfile version: ${lockfile.lockfileVersion}`);
console.log(`- package manager: ${packageJson.packageManager}`);
console.log(`- packages checked: ${packageManagerCounts.packages}`);
console.log(`- registry tarballs checked: ${packageManagerCounts.registryTarballs}`);
console.log(`- sha512 integrity entries checked: ${packageManagerCounts.sha512Integrity}`);

if (failures.length > 0) {
  console.error("\nLockfile supply-chain policy failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Lockfile supply-chain policy passed.");

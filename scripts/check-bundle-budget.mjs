import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIST_DIR = "dist";
const TRACKED_EXTENSIONS = new Set([".css", ".html", ".js"]);
const KIB = 1024;

const budgets = [
  {
    name: "JavaScript asset",
    matches: (file) => file.startsWith("assets/") && file.endsWith(".js"),
    rawBytes: 260 * KIB,
    gzipBytes: 85 * KIB,
  },
  {
    name: "CSS asset",
    matches: (file) => file.startsWith("assets/") && file.endsWith(".css"),
    rawBytes: 24 * KIB,
    gzipBytes: 5 * KIB,
  },
  {
    name: "HTML shell",
    matches: (file) => file === "index.html",
    rawBytes: 2 * KIB,
    gzipBytes: 1 * KIB,
  },
];

const totalBudget = {
  rawBytes: 300 * KIB,
  gzipBytes: 96 * KIB,
};

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectFiles(absolutePath);
    }

    if (!TRACKED_EXTENSIONS.has(extname(entry))) {
      return [];
    }

    return [absolutePath];
  });
}

function formatBytes(bytes) {
  return `${(bytes / KIB).toFixed(2)} KiB`;
}

function findBudget(file) {
  return budgets.find((budget) => budget.matches(file));
}

if (!existsSync(DIST_DIR)) {
  console.error(`Bundle budget failed: ${DIST_DIR} does not exist. Run npm run build:pages first.`);
  process.exit(1);
}

const measuredFiles = collectFiles(DIST_DIR)
  .sort()
  .map((absolutePath) => {
    const relativePath = relative(DIST_DIR, absolutePath);
    const content = readFileSync(absolutePath);

    return {
      file: relativePath,
      rawBytes: content.byteLength,
      gzipBytes: gzipSync(content).byteLength,
    };
  });

if (measuredFiles.length === 0) {
  console.error(`Bundle budget failed: no tracked files were found in ${DIST_DIR}.`);
  process.exit(1);
}

const failures = [];
let totalRawBytes = 0;
let totalGzipBytes = 0;

console.log("Bundle budget report");

for (const file of measuredFiles) {
  const budget = findBudget(file.file);
  totalRawBytes += file.rawBytes;
  totalGzipBytes += file.gzipBytes;

  if (!budget) {
    failures.push(`${file.file}: no budget configured`);
    continue;
  }

  console.log(`- ${file.file}: ${formatBytes(file.rawBytes)} raw, ${formatBytes(file.gzipBytes)} gzip`);

  if (file.rawBytes > budget.rawBytes) {
    failures.push(
      `${file.file}: raw ${formatBytes(file.rawBytes)} exceeds ${budget.name} budget ${formatBytes(budget.rawBytes)}`,
    );
  }

  if (file.gzipBytes > budget.gzipBytes) {
    failures.push(
      `${file.file}: gzip ${formatBytes(file.gzipBytes)} exceeds ${budget.name} budget ${formatBytes(
        budget.gzipBytes,
      )}`,
    );
  }
}

console.log(`- total: ${formatBytes(totalRawBytes)} raw, ${formatBytes(totalGzipBytes)} gzip`);

if (totalRawBytes > totalBudget.rawBytes) {
  failures.push(`total raw ${formatBytes(totalRawBytes)} exceeds budget ${formatBytes(totalBudget.rawBytes)}`);
}

if (totalGzipBytes > totalBudget.gzipBytes) {
  failures.push(`total gzip ${formatBytes(totalGzipBytes)} exceeds budget ${formatBytes(totalBudget.gzipBytes)}`);
}

if (failures.length > 0) {
  console.error("\nBundle budget failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Bundle budget passed.");

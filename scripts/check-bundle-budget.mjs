import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIST_DIR = "dist";
const TRACKED_EXTENSIONS = new Set([".css", ".html", ".js", ".svg", ".txt", ".webmanifest", ".xml"]);
const KIB = 1024;

const budgets = [
  {
    name: "JavaScript asset",
    matches: (file) => file.startsWith("assets/") && file.endsWith(".js"),
    rawBytes: 264 * KIB,
    gzipBytes: 85 * KIB,
  },
  {
    name: "CSS asset",
    matches: (file) => file.startsWith("assets/") && file.endsWith(".css"),
    rawBytes: 37 * KIB,
    gzipBytes: 7 * KIB,
  },
  {
    name: "HTML shell",
    // 404.html is a copy of the shell that lets GitHub Pages serve deep links.
    matches: (file) => file === "index.html" || file === "404.html",
    rawBytes: 4 * KIB,
    gzipBytes: 1 * KIB,
  },
  {
    name: "web metadata asset",
    matches: (file) => ["icon.svg", "robots.txt", "site.webmanifest", "sitemap.xml"].includes(file),
    rawBytes: 6 * KIB,
    gzipBytes: 3 * KIB,
  },
  {
    name: "service worker",
    matches: (file) => file === "sw.js",
    rawBytes: 8 * KIB,
    gzipBytes: 4 * KIB,
  },
  {
    name: "Workbox runtime",
    matches: (file) => file.startsWith("workbox-") && file.endsWith(".js"),
    rawBytes: 32 * KIB,
    gzipBytes: 12 * KIB,
  },
];

const totalBudget = {
  // The evidence-ledger chunk is deferred from the initial practice route but
  // remains part of the offline-capable Pages output, alongside the router and
  // the 404.html deep-link fallback added with URL-addressable destinations, and
  // the Today screen, and the Sight-Reading Academy.
  // The rhythm engine is a new lazy practice capability with its own session,
  // grading, and accessible feedback surface.
  rawBytes: 435 * KIB,
  gzipBytes: 137 * KIB,
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

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const DIST_DIR = "dist";
const SW_FILE = "sw.js";
const REQUIRED_PRECACHE_ENTRIES = [
  "index.html",
  "icon.svg",
  "social-card.png",
  "site.webmanifest",
  "robots.txt",
  "sitemap.xml",
];
const DISALLOWED_SERVICE_WORKER_PATTERNS = [
  {
    pattern: /\bhttps?:\/\//,
    reason: "service worker must not reference external URLs",
  },
  {
    pattern: /\bperiodicSync\b|\bsync\b/,
    reason: "service worker must not add background sync",
  },
  {
    pattern: /\bpush\b|\bNotification\b/,
    reason: "service worker must not add push notifications",
  },
  {
    pattern: /\bimportScripts\s*\(\s*["']https?:\/\//,
    reason: "service worker must not import external scripts",
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readDistFile(file) {
  const filePath = join(DIST_DIR, file);
  assert(existsSync(filePath), `${filePath} does not exist. Run npm run build:pages first.`);
  return readFileSync(filePath, "utf8");
}

function collectDistFiles() {
  assert(existsSync(DIST_DIR), `${DIST_DIR} does not exist. Run npm run build:pages first.`);
  return readdirSync(DIST_DIR, { recursive: true })
    .filter((entry) => typeof entry === "string")
    .sort();
}

console.log("PWA artifact report");

const distFiles = collectDistFiles();
const serviceWorker = readDistFile(SW_FILE);
const workboxFiles = distFiles.filter((file) => file.startsWith("workbox-") && extname(file) === ".js");
const appScripts = distFiles.filter((file) => file.startsWith("assets/") && extname(file) === ".js");
const appStyles = distFiles.filter((file) => file.startsWith("assets/") && extname(file) === ".css");

assert(workboxFiles.length === 1, `Expected exactly one Workbox runtime file; found ${workboxFiles.length}`);
assert(appScripts.length > 0, "PWA precache must include at least one app JavaScript asset");
assert(appStyles.length > 0, "PWA precache must include at least one app CSS asset");
assert(
  serviceWorker.includes(`"./${workboxFiles[0]?.replace(/\.js$/, "")}"`),
  "Service worker must import the local Workbox runtime",
);
assert(serviceWorker.includes("precacheAndRoute"), "Service worker must use Workbox precaching");

for (const requiredEntry of REQUIRED_PRECACHE_ENTRIES) {
  assert(serviceWorker.includes(`url:"${requiredEntry}"`), `Service worker precache is missing ${requiredEntry}`);
}

for (const asset of [...appScripts, ...appStyles]) {
  assert(serviceWorker.includes(`url:"${asset}"`), `Service worker precache is missing ${asset}`);
}

for (const { pattern, reason } of DISALLOWED_SERVICE_WORKER_PATTERNS) {
  assert(!pattern.test(serviceWorker), reason);
}

console.log(`- service worker: ${SW_FILE}`);
console.log(`- Workbox runtime: ${workboxFiles[0]}`);
console.log(`- app assets precached: ${appScripts.length + appStyles.length}`);
console.log("PWA artifacts passed.");

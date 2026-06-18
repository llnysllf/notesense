import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

const DIST_DIR = "dist";
const LIVE_URL = "https://llnysllf.github.io/notesense/";
const EXPECTED_BASE_PATH = "/notesense/";

const requiredHtmlSnippets = [
  "<title>NoteSense | Piano Note Reading Trainer</title>",
  '<meta name="description" content="NoteSense is a focused piano note-reading trainer for beginner musicians.',
  '<meta name="application-name" content="NoteSense"',
  '<meta name="theme-color" content="#1d1d1f"',
  '<meta name="color-scheme" content="light dark"',
  `<link rel="canonical" href="${LIVE_URL}"`,
  `<link rel="icon" type="image/svg+xml" href="${EXPECTED_BASE_PATH}icon.svg"`,
  `<link rel="manifest" href="${EXPECTED_BASE_PATH}site.webmanifest"`,
  '<meta property="og:type" content="website"',
  '<meta property="og:site_name" content="NoteSense"',
  '<meta property="og:title" content="NoteSense | Piano Note Reading Trainer"',
  `<meta property="og:url" content="${LIVE_URL}"`,
  '<meta name="twitter:card" content="summary"',
  '<meta name="twitter:title" content="NoteSense | Piano Note Reading Trainer"',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readDistFile(fileName) {
  const filePath = join(DIST_DIR, fileName);
  assert(existsSync(filePath), `Missing built metadata file: ${filePath}`);
  return readFileSync(filePath, "utf8");
}

function assertIncludes(content, snippet, label) {
  assert(includesContractSnippet(content, snippet), `${label} is missing expected snippet: ${snippet}`);
}

function parseJson(content, label) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertManifest(manifest) {
  assert(manifest.name === "NoteSense", "Manifest name must be NoteSense");
  assert(manifest.short_name === "NoteSense", "Manifest short_name must be NoteSense");
  assert(manifest.start_url === ".", "Manifest start_url must stay relative for Pages deployment");
  assert(manifest.scope === ".", "Manifest scope must stay relative for Pages deployment");
  assert(manifest.display === "standalone", "Manifest display must be standalone");
  assert(manifest.background_color === "#f6f7f1", "Manifest background_color does not match the product shell");
  assert(manifest.theme_color === "#1d1d1f", "Manifest theme_color does not match the HTML theme color");
  assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, "Manifest must include at least one icon");

  const icon = manifest.icons.find((entry) => entry.src === "icon.svg");
  assert(icon, "Manifest must reference icon.svg");
  assert(icon.sizes === "any", "Manifest SVG icon must use sizes=any");
  assert(icon.type === "image/svg+xml", "Manifest icon type must be image/svg+xml");
  assert(icon.purpose === "any maskable", "Manifest icon purpose must support any maskable");
}

console.log("Web metadata report");

assert(existsSync(DIST_DIR), `${DIST_DIR} does not exist. Run npm run build:pages first.`);

const html = readDistFile("index.html");
for (const snippet of requiredHtmlSnippets) {
  assertIncludes(html, snippet, "Built HTML");
}
console.log("- HTML shell metadata passed");

const manifest = parseJson(readDistFile("site.webmanifest"), "site.webmanifest");
assertManifest(manifest);
console.log("- web manifest passed");

const iconSvg = readDistFile("icon.svg");
assertIncludes(iconSvg, "<svg", "icon.svg");
assertIncludes(iconSvg, "viewBox=", "icon.svg");
assertIncludes(iconSvg, "<title", "icon.svg");
console.log("- icon.svg passed");

const robots = readDistFile("robots.txt");
assertIncludes(robots, "User-agent: *", "robots.txt");
assertIncludes(robots, "Allow: /", "robots.txt");
assertIncludes(robots, `Sitemap: ${LIVE_URL}sitemap.xml`, "robots.txt");
console.log("- robots.txt passed");

const sitemap = readDistFile("sitemap.xml");
assertIncludes(sitemap, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', "sitemap.xml");
assertIncludes(sitemap, `<loc>${LIVE_URL}</loc>`, "sitemap.xml");
console.log("- sitemap.xml passed");

console.log("Web metadata passed.");

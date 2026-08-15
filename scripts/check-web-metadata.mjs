import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { includesContractSnippet } from "./lib/contract-checks.mjs";

const DIST_DIR = "dist";
const LIVE_URL = "https://llnysllf.github.io/notesense/";
const EXPECTED_BASE_PATH = "/notesense/";

const requiredHtmlSnippets = [
  "<title>NoteSense | Piano Note Reading Trainer</title>",
  '<meta name="description" content="Practice sight reading, rhythm, ear training, and singing in your browser. Free, offline, and no account needed.',
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

// Per-page metadata for the public site.
//
// The app is a single page, so without prerendering every public URL would
// return the home page's title and description — which is what a crawler, a
// link preview, and a browser tab all read. These assertions are what stop that
// regressing quietly: a page whose head was not swapped looks identical to a
// working one until someone shares the link.
function publicPageDirectories() {
  return readdirSync(DIST_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "assets")
    .map((entry) => entry.name)
    .sort();
}

const shellTitle = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
const shellDescription = /<meta[^>]*name="description"[^>]*content="([^"]*)"/.exec(html)?.[1] ?? "";
const publicPages = publicPageDirectories();
assert(publicPages.length > 0, "No prerendered public pages were emitted");

for (const name of publicPages) {
  const pageHtml = readDistFile(`${name}/index.html`);
  const title = /<title>([^<]*)<\/title>/.exec(pageHtml)?.[1] ?? "";
  const canonical = /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/.exec(pageHtml)?.[1] ?? "";
  const description = /<meta[^>]*name="description"[^>]*content="([^"]*)"/.exec(pageHtml)?.[1] ?? "";
  const ogUrl = /<meta[^>]*property="og:url"[^>]*content="([^"]*)"/.exec(pageHtml)?.[1] ?? "";

  assert(title.length > 0 && title !== shellTitle, `${name}/index.html still carries the shell title`);
  assert(description.length > 0, `${name}/index.html has no description`);
  assert(description !== shellDescription, `${name}/index.html still carries the shell description`);
  assert(canonical === `${LIVE_URL}${name}`, `${name}/index.html canonical is ${canonical || "missing"}`);
  assert(ogUrl === canonical, `${name}/index.html og:url does not match its canonical`);
  assertIncludes(pageHtml, `<meta property="og:title" content="${title}"`, `${name}/index.html`);
}
console.log(`- prerendered public pages checked: ${publicPages.length}`);

console.log("Web metadata passed.");

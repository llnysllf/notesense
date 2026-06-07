import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const DIST_DIR = "dist";
const SOURCE_ROOTS = ["src", "public"];
const SOURCE_FILES = ["index.html"];
const CLIENT_EXTENSIONS = new Set([".css", ".html", ".svg", ".ts", ".tsx", ".txt", ".webmanifest", ".xml"]);
const ALLOWED_ABSOLUTE_URLS = new Set([
  "http://www.sitemaps.org/schemas/sitemap/0.9",
  "http://www.w3.org/2000/svg",
  "https://llnysllf.github.io/notesense/",
  "https://llnysllf.github.io/notesense/sitemap.xml",
]);

const bannedRuntimePatterns = [
  {
    pattern: /\bfetch\s*\(/,
    reason: "client runtime must not add required network fetches without privacy review",
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    reason: "client runtime must not add XHR calls without privacy review",
  },
  {
    pattern: /\bnavigator\.sendBeacon\b/,
    reason: "client runtime must not add telemetry beacons",
  },
  {
    pattern: /\bWebSocket\b/,
    reason: "client runtime must not add websocket connections without privacy review",
  },
  {
    pattern: /\bEventSource\b/,
    reason: "client runtime must not add event streams without privacy review",
  },
  {
    pattern: /\bdocument\.cookie\b/,
    reason: "client runtime must not read or write cookies",
  },
  {
    pattern: /\bimportScripts\s*\(/,
    reason: "client runtime must not add worker script imports without review",
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectFiles(absolutePath);
    }

    if (!CLIENT_EXTENSIONS.has(extname(entry))) {
      return [];
    }

    return [absolutePath];
  });
}

function collectClientSourceFiles() {
  const sourceRootFiles = SOURCE_ROOTS.flatMap((root) => (existsSync(root) ? collectFiles(root) : []));
  return [...SOURCE_FILES, ...sourceRootFiles].sort();
}

function getLineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function findAbsoluteUrls(content) {
  return [...content.matchAll(/\bhttps?:\/\/[^\s"'<>)}\]]+/g)].map((match) => ({
    index: match.index ?? 0,
    value: match[0].replace(/[.,;]+$/, ""),
  }));
}

function checkAllowedUrls(file, content, failures) {
  for (const { index, value } of findAbsoluteUrls(content)) {
    if (!ALLOWED_ABSOLUTE_URLS.has(value)) {
      failures.push(`${file}:${getLineNumber(content, index)} uses unapproved absolute URL ${value}`);
    }
  }
}

function checkRuntimePatterns(file, content, failures) {
  for (const { pattern, reason } of bannedRuntimePatterns) {
    const match = pattern.exec(content);

    if (match?.index !== undefined) {
      failures.push(`${file}:${getLineNumber(content, match.index)} ${reason}`);
    }
  }
}

function getHtmlAttributes(html, attribute) {
  return [...html.matchAll(new RegExp(`\\b${attribute}="([^"]+)"`, "g"))].map((match) => match[1]);
}

function checkBuiltHtml(failures) {
  const htmlPath = join(DIST_DIR, "index.html");
  assert(existsSync(htmlPath), `${htmlPath} does not exist. Run npm run build:pages first.`);

  const html = readFileSync(htmlPath, "utf8");
  const references = [...getHtmlAttributes(html, "href"), ...getHtmlAttributes(html, "src")];

  for (const reference of references) {
    if (!reference) {
      continue;
    }

    if (reference.startsWith("http://") || reference.startsWith("https://")) {
      if (!ALLOWED_ABSOLUTE_URLS.has(reference)) {
        failures.push(`${htmlPath} references unapproved external resource ${reference}`);
      }
      continue;
    }

    if (!reference.startsWith("/notesense/")) {
      failures.push(`${htmlPath} references non-Pages-scoped resource ${reference}`);
    }
  }

  const scriptSources = getHtmlAttributes(html, "src").filter(Boolean);
  for (const source of scriptSources) {
    if (!source.startsWith("/notesense/assets/")) {
      failures.push(`${htmlPath} contains script source outside built Pages assets: ${source}`);
    }
  }
}

console.log("Runtime surface report");

const failures = [];
const clientSourceFiles = collectClientSourceFiles();

for (const file of clientSourceFiles) {
  const content = readFileSync(file, "utf8");
  checkAllowedUrls(file, content, failures);
  checkRuntimePatterns(file, content, failures);
}

checkBuiltHtml(failures);

console.log(`- client files checked: ${clientSourceFiles.length}`);
console.log("- build HTML references checked");

if (failures.length > 0) {
  console.error("\nRuntime surface check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Runtime surface passed.");

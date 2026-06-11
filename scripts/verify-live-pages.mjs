const DEFAULT_LIVE_URL = "https://llnysllf.github.io/notesense/";
const EXPECTED_BASE_PATH = "/notesense/";
const EXPECTED_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'none'",
].join("; ");
const EXPECTED_METADATA_PATHS = [
  {
    path: `${EXPECTED_BASE_PATH}site.webmanifest`,
    contentTypeIncludes: ["application/manifest+json", "application/json"],
  },
  {
    path: `${EXPECTED_BASE_PATH}icon.svg`,
    contentTypeIncludes: ["image/svg+xml"],
  },
  {
    path: `${EXPECTED_BASE_PATH}robots.txt`,
    contentTypeIncludes: ["text/plain"],
  },
  {
    path: `${EXPECTED_BASE_PATH}sitemap.xml`,
    contentTypeIncludes: ["application/xml", "text/xml"],
  },
];
const SERVICE_WORKER_PATH = `${EXPECTED_BASE_PATH}sw.js`;
const REQUIRED_SERVICE_WORKER_PRECACHE_ENTRIES = [
  "index.html",
  "icon.svg",
  "site.webmanifest",
  "robots.txt",
  "sitemap.xml",
];
const DISALLOWED_SERVICE_WORKER_PATTERNS = [
  {
    pattern: /\bhttps?:\/\//,
    reason: "Live service worker must not reference external URLs",
  },
  {
    pattern: /\bperiodicSync\b|\bsync\b/,
    reason: "Live service worker must not add background sync",
  },
  {
    pattern: /\bpush\b|\bNotification\b/,
    reason: "Live service worker must not add push notifications",
  },
  {
    pattern: /\bimportScripts\s*\(\s*["']https?:\/\//,
    reason: "Live service worker must not import external scripts",
  },
];

function getLiveUrl() {
  const [rawUrl] = process.argv.slice(2);
  return rawUrl ?? process.env.NOTESENSE_LIVE_URL ?? DEFAULT_LIVE_URL;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "notesense-live-verifier",
    },
  });

  assert(response.ok, `${url} returned HTTP ${response.status}`);

  return {
    response,
    text: await response.text(),
  };
}

async function fetchHeaders(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "notesense-live-verifier",
    },
    method: "HEAD",
  });

  assert(response.ok, `${url} returned HTTP ${response.status}`);

  return response;
}

function getAssetPaths(html) {
  const matches = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(([, value]) => value);
  return matches.filter((value) => value.startsWith(`${EXPECTED_BASE_PATH}assets/`)).sort();
}

function getSecurityPolicy(html) {
  const match = html.match(/<meta\s+[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"[^>]*>/);
  return match?.[1] ?? "";
}

function formatHeader(response, header) {
  return response.headers.get(header) ?? "missing";
}

function assertContentType(response, expectedTypes, label) {
  const contentType = response.headers.get("content-type") ?? "";

  assert(
    expectedTypes.some((expectedType) => contentType.includes(expectedType)),
    `${label} returned unexpected content type "${contentType}"`,
  );

  return contentType;
}

function toServiceWorkerPrecachePath(assetPath) {
  assert(assetPath.startsWith(EXPECTED_BASE_PATH), `Expected ${assetPath} to be scoped to ${EXPECTED_BASE_PATH}`);

  return assetPath.slice(EXPECTED_BASE_PATH.length);
}

function getWorkboxRuntimeFile(serviceWorker) {
  const match = serviceWorker.match(/["']\.\/(workbox-[A-Za-z0-9_-]+)(?:\.js)?["']/);
  assert(match?.[1], "Live service worker does not import a local Workbox runtime");

  return `${match[1]}.js`;
}

function verifyServiceWorker(serviceWorker, appAssetPaths) {
  assert(serviceWorker.includes("precacheAndRoute"), "Live service worker must use Workbox precaching");
  assert(serviceWorker.includes("cleanupOutdatedCaches"), "Live service worker must clean outdated caches");

  for (const requiredEntry of REQUIRED_SERVICE_WORKER_PRECACHE_ENTRIES) {
    assert(
      serviceWorker.includes(`url:"${requiredEntry}"`),
      `Live service worker precache is missing ${requiredEntry}`,
    );
  }

  for (const assetPath of appAssetPaths.map(toServiceWorkerPrecachePath)) {
    assert(serviceWorker.includes(`url:"${assetPath}"`), `Live service worker precache is missing ${assetPath}`);
  }

  for (const { pattern, reason } of DISALLOWED_SERVICE_WORKER_PATTERNS) {
    assert(!pattern.test(serviceWorker), reason);
  }

  return getWorkboxRuntimeFile(serviceWorker);
}

const liveUrl = new URL(getLiveUrl());

console.log("Live deployment verification");
console.log(`- URL: ${liveUrl.href}`);

const headResponse = await fetchHeaders(liveUrl);
console.log(`- HEAD: HTTP ${headResponse.status}`);
console.log(`- Content-Type: ${formatHeader(headResponse, "content-type")}`);

const { response: htmlResponse, text: html } = await fetchText(liveUrl);
const htmlContentType = htmlResponse.headers.get("content-type") ?? "";

assert(htmlContentType.includes("text/html"), `Expected HTML content type, received "${htmlContentType}"`);
assert(html.includes("<title>NoteSense | Piano Note Reading Trainer</title>"), "Live HTML title is not NoteSense");
assert(html.includes('id="root"'), "Live HTML is missing the React root");
assert(
  html.includes(`href="${EXPECTED_BASE_PATH}site.webmanifest"`),
  "Live HTML is missing the Pages-scoped web manifest link",
);
assert(html.includes(`href="${EXPECTED_BASE_PATH}icon.svg"`), "Live HTML is missing the Pages-scoped icon link");
assert(
  html.includes('property="og:title" content="NoteSense | Piano Note Reading Trainer"'),
  "Live HTML is missing Open Graph title metadata",
);
assert(
  getSecurityPolicy(html) === EXPECTED_SECURITY_POLICY,
  "Live HTML Content Security Policy does not match expected policy",
);
console.log("- Content-Security-Policy meta tag passed");

const assetPaths = getAssetPaths(html);
assert(assetPaths.length > 0, `Live HTML does not reference ${EXPECTED_BASE_PATH}assets/`);

for (const assetPath of assetPaths) {
  const assetUrl = new URL(assetPath, liveUrl.origin);
  const assetResponse = await fetchHeaders(assetUrl);
  const contentType = assetResponse.headers.get("content-type") ?? "";

  assert(
    contentType.includes("javascript") || contentType.includes("css"),
    `${assetUrl.href} returned unexpected content type "${contentType}"`,
  );

  console.log(`- ${assetPath}: HTTP ${assetResponse.status}, ${contentType}`);
}

for (const metadataPath of EXPECTED_METADATA_PATHS) {
  const metadataUrl = new URL(metadataPath.path, liveUrl.origin);
  const metadataResponse = await fetchHeaders(metadataUrl);
  const contentType = assertContentType(metadataResponse, metadataPath.contentTypeIncludes, metadataUrl.href);

  console.log(`- ${metadataPath.path}: HTTP ${metadataResponse.status}, ${contentType}`);
}

const serviceWorkerUrl = new URL(SERVICE_WORKER_PATH, liveUrl.origin);
const { response: serviceWorkerResponse, text: serviceWorker } = await fetchText(serviceWorkerUrl);
const serviceWorkerContentType = assertContentType(serviceWorkerResponse, ["javascript"], serviceWorkerUrl.href);
const workboxRuntimeFile = verifyServiceWorker(serviceWorker, assetPaths);

console.log(`- ${SERVICE_WORKER_PATH}: HTTP ${serviceWorkerResponse.status}, ${serviceWorkerContentType}`);

const workboxRuntimePath = `${EXPECTED_BASE_PATH}${workboxRuntimeFile}`;
const workboxRuntimeUrl = new URL(workboxRuntimePath, liveUrl.origin);
const { response: workboxRuntimeResponse, text: workboxRuntime } = await fetchText(workboxRuntimeUrl);
const workboxRuntimeContentType = assertContentType(workboxRuntimeResponse, ["javascript"], workboxRuntimeUrl.href);

assert(workboxRuntime.includes("precacheAndRoute"), "Live Workbox runtime does not include precache support");

console.log(`- ${workboxRuntimePath}: HTTP ${workboxRuntimeResponse.status}, ${workboxRuntimeContentType}`);

console.log("Live deployment verification passed.");

const DEFAULT_LIVE_URL = "https://llnysllf.github.io/notesense/";
const EXPECTED_BASE_PATH = "/notesense/";

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

function formatHeader(response, header) {
  return response.headers.get(header) ?? "missing";
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

console.log("Live deployment verification passed.");

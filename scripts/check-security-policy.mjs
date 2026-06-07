import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = "dist";
const HTML_PATH = join(DIST_DIR, "index.html");
const EXPECTED_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "form-action 'none'",
].join("; ");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getCspMetaTags(html) {
  return [...html.matchAll(/<meta\s+[^>]*http-equiv="Content-Security-Policy"[^>]*>/g)].map((match) => ({
    index: match.index ?? 0,
    tag: match[0],
  }));
}

function getAttribute(tag, attribute) {
  const match = tag.match(new RegExp(`\\b${attribute}="([^"]*)"`));
  return match?.[1] ?? "";
}

function findInlineScripts(html) {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>/g)];
}

function findInlineStyles(html) {
  return [...html.matchAll(/<style\b|<[^>]+\sstyle=/g)];
}

function findInlineEventHandlers(html) {
  return [...html.matchAll(/<[^>]+\son[a-z]+\s*=/gi)];
}

console.log("Security policy report");

assert(existsSync(HTML_PATH), `${HTML_PATH} does not exist. Run npm run build:pages first.`);

const html = readFileSync(HTML_PATH, "utf8");
const cspMetaTags = getCspMetaTags(html);
assert(cspMetaTags.length === 1, `Built HTML must contain exactly one CSP meta tag; found ${cspMetaTags.length}`);

const cspMeta = cspMetaTags[0];
assert(cspMeta, "Built HTML is missing the CSP meta tag");
assert(cspMeta.index < html.indexOf("<title>"), "CSP meta tag must appear before the document title");
assert(getAttribute(cspMeta.tag, "content") === EXPECTED_POLICY, "Built HTML CSP does not match the expected policy");

assert(findInlineScripts(html).length === 0, "Built HTML must not contain inline script tags");
assert(findInlineStyles(html).length === 0, "Built HTML must not contain inline styles");
assert(findInlineEventHandlers(html).length === 0, "Built HTML must not contain inline event handlers");

console.log("- Content-Security-Policy meta tag passed");
console.log("- built HTML shell inline code checks passed");
console.log("Security policy passed.");

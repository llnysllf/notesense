import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const ROOT_DIR = process.cwd();
const IGNORED_DIRECTORIES = new Set([".git", "coverage", "dist", "node_modules", "playwright-report", "test-results"]);
const MARKDOWN_EXTENSION = ".md";
const MARKDOWN_LINK_PATTERN = /!?\[[^\]\n]*\]\(([^)\n]+)\)/g;
const NPM_RUN_PATTERN = /\bnpm\s+run\s+([A-Za-z0-9:_-]+)/g;
const NPM_TEST_PATTERN = /\bnpm\s+test\b/g;

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageScripts = new Set(Object.keys(packageJson.scripts ?? {}));
const headingAnchorsByFile = new Map();

function toProjectPath(file) {
  return relative(ROOT_DIR, file).split(sep).join("/");
}

function collectMarkdownFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if (IGNORED_DIRECTORIES.has(entry)) {
      return [];
    }

    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectMarkdownFiles(absolutePath);
    }

    if (extname(entry) !== MARKDOWN_EXTENSION) {
      return [];
    }

    return [toProjectPath(absolutePath)];
  });
}

function getLineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function stripFencedCode(content) {
  return content.replace(/```[\s\S]*?```/g, (match) => match.replace(/[^\n]/g, ""));
}

function parseLinkTarget(rawTarget) {
  const trimmedTarget = rawTarget.trim();

  if (trimmedTarget.startsWith("<")) {
    const closingIndex = trimmedTarget.indexOf(">");
    return closingIndex === -1 ? trimmedTarget.slice(1) : trimmedTarget.slice(1, closingIndex);
  }

  return trimmedTarget.split(/\s+/)[0] ?? "";
}

function isExternalTarget(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//");
}

function decodeTarget(target) {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

function splitTarget(target) {
  const hashIndex = target.indexOf("#");
  const pathAndQuery = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : target.slice(hashIndex + 1);
  const queryIndex = pathAndQuery.indexOf("?");
  const path = queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);

  return {
    fragment: decodeTarget(fragment),
    path: decodeTarget(path),
  };
}

function resolveLocalTarget(sourceFile, target) {
  const { fragment, path } = splitTarget(target);
  const sourceAbsolutePath = resolve(ROOT_DIR, sourceFile);
  const targetPath = path.startsWith("/") ? `.${path}` : path;
  const targetAbsolutePath =
    targetPath.length === 0 ? sourceAbsolutePath : resolve(ROOT_DIR, dirname(sourceFile), targetPath);

  return {
    absolutePath: targetAbsolutePath,
    fragment,
    projectPath: toProjectPath(targetAbsolutePath),
  };
}

function normalizeHeadingText(rawHeading) {
  return rawHeading
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

function slugifyHeading(rawHeading) {
  return normalizeHeadingText(rawHeading)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function getHeadingAnchors(file) {
  if (headingAnchorsByFile.has(file)) {
    return headingAnchorsByFile.get(file);
  }

  const content = readFileSync(resolve(ROOT_DIR, file), "utf8");
  const anchors = new Set();
  const slugCounts = new Map();

  for (const match of content.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const rawHeading = match[1] ?? "";
    const slug = slugifyHeading(rawHeading);

    if (slug.length === 0) {
      continue;
    }

    const duplicateCount = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, duplicateCount + 1);
    anchors.add(duplicateCount === 0 ? slug : `${slug}-${duplicateCount}`);
  }

  headingAnchorsByFile.set(file, anchors);
  return anchors;
}

function normalizeFragment(fragment) {
  return fragment.replace(/^user-content-/, "").toLowerCase();
}

function checkMarkdownLinks(file, content, failures) {
  let localLinkCount = 0;
  let externalLinkCount = 0;
  const contentWithoutCode = stripFencedCode(content);

  for (const match of contentWithoutCode.matchAll(MARKDOWN_LINK_PATTERN)) {
    const rawTarget = match[1] ?? "";
    const target = parseLinkTarget(rawTarget);
    const index = match.index ?? 0;

    if (target.length === 0) {
      continue;
    }

    if (isExternalTarget(target)) {
      externalLinkCount += 1;

      if (target.startsWith("http://")) {
        failures.push(`${file}:${getLineNumber(contentWithoutCode, index)} uses an insecure external link: ${target}`);
      }

      continue;
    }

    localLinkCount += 1;
    const resolvedTarget = resolveLocalTarget(file, target);
    const relativeTarget = relative(ROOT_DIR, resolvedTarget.absolutePath);

    if (relativeTarget === ".." || relativeTarget.startsWith(`..${sep}`)) {
      failures.push(`${file}:${getLineNumber(contentWithoutCode, index)} links outside the repository: ${target}`);
      continue;
    }

    if (!existsSync(resolvedTarget.absolutePath)) {
      failures.push(`${file}:${getLineNumber(contentWithoutCode, index)} links to missing file: ${target}`);
      continue;
    }

    if (resolvedTarget.fragment.length > 0) {
      if (extname(resolvedTarget.projectPath) !== MARKDOWN_EXTENSION) {
        failures.push(
          `${file}:${getLineNumber(contentWithoutCode, index)} links to an anchor in a non-Markdown file: ${target}`,
        );
        continue;
      }

      const anchors = getHeadingAnchors(resolvedTarget.projectPath);
      const normalizedFragment = normalizeFragment(resolvedTarget.fragment);

      if (!anchors.has(normalizedFragment)) {
        failures.push(`${file}:${getLineNumber(contentWithoutCode, index)} links to missing anchor: ${target}`);
      }
    }
  }

  return { externalLinkCount, localLinkCount };
}

function checkNpmScriptReferences(file, content, failures) {
  let npmScriptReferenceCount = 0;

  for (const match of content.matchAll(NPM_RUN_PATTERN)) {
    const scriptName = match[1] ?? "";
    npmScriptReferenceCount += 1;

    if (!packageScripts.has(scriptName)) {
      failures.push(
        `${file}:${getLineNumber(content, match.index ?? 0)} references missing package script: npm run ${scriptName}`,
      );
    }
  }

  for (const match of content.matchAll(NPM_TEST_PATTERN)) {
    npmScriptReferenceCount += 1;

    if (!packageScripts.has("test")) {
      failures.push(`${file}:${getLineNumber(content, match.index ?? 0)} references missing package script: npm test`);
    }
  }

  return npmScriptReferenceCount;
}

console.log("Documentation integrity report");

const failures = [];
const markdownFiles = collectMarkdownFiles(ROOT_DIR).sort();
let localLinksChecked = 0;
let externalLinksSkipped = 0;
let npmScriptReferencesChecked = 0;

for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");
  const linkCounts = checkMarkdownLinks(file, content, failures);
  localLinksChecked += linkCounts.localLinkCount;
  externalLinksSkipped += linkCounts.externalLinkCount;
  npmScriptReferencesChecked += checkNpmScriptReferences(file, content, failures);
}

console.log(`- Markdown files checked: ${markdownFiles.length}`);
console.log(`- local Markdown links checked: ${localLinksChecked}`);
console.log(`- external Markdown links skipped: ${externalLinksSkipped}`);
console.log(`- documented npm script references checked: ${npmScriptReferencesChecked}`);

if (failures.length > 0) {
  console.error("\nDocumentation integrity check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Documentation integrity passed.");

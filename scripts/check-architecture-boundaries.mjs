import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";

const failures = [];
const productionExtensions = new Set([".ts", ".tsx"]);
const sourceRoots = ["src", "shared/src"];
const browserGlobals = [
  { label: "window", pattern: /\bwindow(?:\.|\[|\s*\))/ },
  { label: "document", pattern: /\bdocument(?:\.|\[|\s*\))/ },
  { label: "localStorage", pattern: /\blocalStorage\b/ },
  { label: "sessionStorage", pattern: /\bsessionStorage\b/ },
  { label: "fetch", pattern: /\bfetch\s*\(/ },
  { label: "XMLHttpRequest", pattern: /\bXMLHttpRequest\b/ },
  { label: "navigator", pattern: /\bnavigator\./ },
  { label: "AudioContext", pattern: /\bAudioContext\b/ },
  { label: "webkitAudioContext", pattern: /\bwebkitAudioContext\b/ },
  { label: "Worker", pattern: /\bWorker\s*\(/ },
  { label: "WebSocket", pattern: /\bWebSocket\s*\(/ },
  { label: "EventSource", pattern: /\bEventSource\s*\(/ },
  { label: "sendBeacon", pattern: /\bsendBeacon\b/ },
  { label: "BroadcastChannel", pattern: /\bBroadcastChannel\b/ },
  { label: "indexedDB", pattern: /\bindexedDB\b/ },
  { label: "caches", pattern: /\bcaches\./ },
];

const componentSideEffects = [
  { label: "localStorage", pattern: /\blocalStorage\b/ },
  { label: "sessionStorage", pattern: /\bsessionStorage\b/ },
  { label: "fetch", pattern: /\bfetch\s*\(/ },
  { label: "XMLHttpRequest", pattern: /\bXMLHttpRequest\b/ },
  { label: "AudioContext", pattern: /\bAudioContext\b/ },
];

function readText(file) {
  return readFileSync(file, "utf8");
}

function listFiles(directory) {
  if (!existsSync(directory)) {
    failures.push(`missing source directory: ${directory}`);
    return [];
  }

  const entries = readdirSync(directory).sort();
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listFiles(path));
      continue;
    }

    if (stats.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function toProjectPath(path) {
  return relative(".", path).replaceAll("\\", "/");
}

function isProductionSource(file) {
  const extension = extname(file);

  return (
    productionExtensions.has(extension) &&
    !file.endsWith(".d.ts") &&
    !file.includes(".test.") &&
    !file.endsWith("src/test-setup.ts")
  );
}

function getProductionSourceFiles() {
  return sourceRoots.flatMap(listFiles).map(toProjectPath).filter(isProductionSource).sort();
}

function getImportSpecifiers(content) {
  const imports = new Set();
  const fromImportPattern = /\b(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+["']([^"']+)["']/g;
  const bareImportPattern = /\bimport\s+["']([^"']+)["']/g;
  const dynamicImportPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

  for (const pattern of [fromImportPattern, bareImportPattern, dynamicImportPattern]) {
    for (const match of content.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier) {
        imports.add(specifier);
      }
    }
  }

  return [...imports].sort();
}

function resolveImport(file, specifier) {
  if (!specifier.startsWith(".")) {
    return specifier;
  }

  return toProjectPath(join(dirname(file), specifier));
}

function pointsAt(resolvedImport, path) {
  return resolvedImport === path || resolvedImport.startsWith(`${path}/`) || resolvedImport.startsWith(`${path}.`);
}

function isReactImport(specifier) {
  return specifier === "react" || specifier.startsWith("react/");
}

function requireNoImport(file, specifiers, predicate, reason) {
  for (const specifier of specifiers) {
    if (predicate(specifier, resolveImport(file, specifier))) {
      failures.push(`${file} must not import ${specifier}; ${reason}`);
    }
  }
}

function requireNoBrowserGlobals(file, content, reason) {
  for (const { label, pattern } of browserGlobals) {
    if (pattern.test(content)) {
      failures.push(`${file} must not reference ${label}; ${reason}`);
    }
  }
}

function requireSharedBoundary(file, specifiers, content) {
  for (const specifier of specifiers) {
    if (!specifier.startsWith(".")) {
      failures.push(`${file} must not import package ${specifier}; shared contracts stay framework-agnostic`);
    }

    const resolvedImport = resolveImport(file, specifier);
    if (resolvedImport.startsWith("src/")) {
      failures.push(`${file} must not import app code through ${specifier}; shared code cannot depend on src`);
    }
  }

  requireNoBrowserGlobals(file, content, "shared contracts must run outside the browser");
}

function requireCoreBoundary(file, specifiers, content) {
  requireNoImport(
    file,
    specifiers,
    (specifier, resolvedImport) =>
      isReactImport(specifier) ||
      pointsAt(resolvedImport, "src/storage") ||
      pointsAt(resolvedImport, "src/audio") ||
      pointsAt(resolvedImport, "src/hooks") ||
      pointsAt(resolvedImport, "src/components") ||
      pointsAt(resolvedImport, "src/App") ||
      pointsAt(resolvedImport, "src/main"),
    "practice data and engine logic must stay pure and framework-independent",
  );

  requireNoBrowserGlobals(file, content, "practice data and engine logic must stay deterministic");
}

function requireStorageBoundary(file, specifiers) {
  requireNoImport(
    file,
    specifiers,
    (specifier, resolvedImport) =>
      isReactImport(specifier) ||
      pointsAt(resolvedImport, "src/audio") ||
      pointsAt(resolvedImport, "src/hooks") ||
      pointsAt(resolvedImport, "src/components") ||
      pointsAt(resolvedImport, "src/App") ||
      pointsAt(resolvedImport, "src/main"),
    "storage owns persistence and must not depend on UI, audio, or React orchestration",
  );
}

function requireComponentBoundary(file, specifiers, content) {
  requireNoImport(
    file,
    specifiers,
    (_specifier, resolvedImport) =>
      pointsAt(resolvedImport, "src/storage") ||
      pointsAt(resolvedImport, "src/hooks") ||
      pointsAt(resolvedImport, "src/audio") ||
      pointsAt(resolvedImport, "src/App") ||
      pointsAt(resolvedImport, "src/main"),
    "components should stay presentation-focused and receive behavior through props",
  );

  for (const { label, pattern } of componentSideEffects) {
    if (pattern.test(content)) {
      failures.push(
        `${file} must not reference ${label}; components should not own persistence, network, or audio side effects`,
      );
    }
  }
}

function requireHookBoundary(file, specifiers) {
  requireNoImport(
    file,
    specifiers,
    (_specifier, resolvedImport) => pointsAt(resolvedImport, "src/components"),
    "hooks should orchestrate state without depending on presentation components",
  );
}

function requireSharedPackageBoundary(file, specifiers) {
  for (const specifier of specifiers) {
    if (specifier !== "@notesense/shared") {
      continue;
    }

    if (file !== "src/storage.ts" && file !== "src/types.ts") {
      failures.push(
        `${file} must not import @notesense/shared directly; route app-facing data contracts through src/types.ts or src/storage.ts`,
      );
    }
  }
}

console.log("Architecture boundary report");

const productionFiles = getProductionSourceFiles();
const sharedFiles = productionFiles.filter((file) => file.startsWith("shared/src/"));
const componentFiles = productionFiles.filter((file) => file.startsWith("src/components/"));
const hookFiles = productionFiles.filter((file) => file.startsWith("src/hooks/"));

for (const file of productionFiles) {
  const content = readText(file);
  const specifiers = getImportSpecifiers(content);

  requireSharedPackageBoundary(file, specifiers);

  if (file.startsWith("shared/src/")) {
    requireSharedBoundary(file, specifiers, content);
  }

  if (file === "src/practiceEngine.ts" || file === "src/noteData.ts") {
    requireCoreBoundary(file, specifiers, content);
  }

  if (file === "src/storage.ts") {
    requireStorageBoundary(file, specifiers);
  }

  if (file.startsWith("src/components/")) {
    requireComponentBoundary(file, specifiers, content);
  }

  if (file.startsWith("src/hooks/")) {
    requireHookBoundary(file, specifiers);
  }
}

console.log(`- production source files checked: ${productionFiles.length}`);
console.log(`- shared contract files checked: ${sharedFiles.length}`);
console.log(`- component files checked: ${componentFiles.length}`);
console.log(`- hook files checked: ${hookFiles.length}`);

if (failures.length > 0) {
  console.error("\nArchitecture boundary check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Architecture boundary check passed.");

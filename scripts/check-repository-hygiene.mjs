import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const REQUIRED_FILES = [
  ".editorconfig",
  ".gitignore",
  ".npmrc",
  ".nvmrc",
  ".prettierignore",
  ".prettierrc.json",
  "CODE_OF_CONDUCT.md",
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
  ".github/pull_request_template.md",
];

const REQUIRED_GITIGNORE_ENTRIES = [
  "node_modules",
  "dist",
  "coverage",
  ".lighthouseci",
  ".DS_Store",
  ".env",
  ".env.local",
  "*.log",
  "*.tsbuildinfo",
  "playwright-report",
  "test-results",
  "vite.config.js",
  "vite.config.d.ts",
];

const REQUIRED_PRETTIERIGNORE_ENTRIES = [
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
  "*.tsbuildinfo",
  "vite.config.js",
  "vite.config.d.ts",
];

const FORBIDDEN_TRACKED_PATHS = [
  { description: "dependency install output", pattern: /^node_modules\// },
  { description: "production build output", pattern: /^dist\// },
  { description: "coverage output", pattern: /^coverage\// },
  { description: "Lighthouse output", pattern: /^\.lighthouseci\// },
  { description: "Playwright report output", pattern: /^playwright-report\// },
  { description: "test result output", pattern: /^test-results\// },
  { description: "local environment file", pattern: /^\.env(?:\.|$)/ },
  { description: "TypeScript build info", pattern: /\.tsbuildinfo$/ },
  { description: "generated Vite config artifact", pattern: /^vite\.config\.(?:js|d\.ts)$/ },
  { description: "log file", pattern: /\.log$/ },
  { description: "macOS metadata file", pattern: /(^|\/)\.DS_Store$/ },
];

function readText(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function readLines(path) {
  return readText(path)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function runGit(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function getTrackedFiles() {
  return runGit(["ls-files", "-z"]).split("\0").filter(Boolean);
}

function getNodeMajor(version) {
  const match = /^(\d+)\./.exec(version);
  return match ? Number(match[1]) : undefined;
}

function hasRequiredEntry(entries, requiredEntry) {
  return entries.includes(requiredEntry);
}

console.log("Repository hygiene report");

const failures = [];

for (const file of REQUIRED_FILES) {
  if (!existsSync(file)) {
    failures.push(`missing required repository file: ${file}`);
  }
}

if (existsSync(".npmrc") && readText(".npmrc") !== "engine-strict=true\n") {
  failures.push(".npmrc must contain exactly engine-strict=true");
}

if (existsSync(".editorconfig")) {
  const editorConfig = readText(".editorconfig");
  const requiredEditorConfigSnippets = [
    "root = true",
    "charset = utf-8",
    "end_of_line = lf",
    "indent_style = space",
    "indent_size = 2",
    "insert_final_newline = true",
    "trim_trailing_whitespace = true",
  ];

  for (const snippet of requiredEditorConfigSnippets) {
    if (!editorConfig.includes(snippet)) {
      failures.push(`.editorconfig must include ${snippet}`);
    }
  }
}

if (existsSync(".gitignore")) {
  const gitignoreEntries = readLines(".gitignore");
  for (const entry of REQUIRED_GITIGNORE_ENTRIES) {
    if (!hasRequiredEntry(gitignoreEntries, entry)) {
      failures.push(`.gitignore must ignore ${entry}`);
    }
  }
}

if (existsSync(".prettierignore")) {
  const prettierIgnoreEntries = readLines(".prettierignore");
  for (const entry of REQUIRED_PRETTIERIGNORE_ENTRIES) {
    if (!hasRequiredEntry(prettierIgnoreEntries, entry)) {
      failures.push(`.prettierignore must ignore ${entry}`);
    }
  }
}

if (existsSync(".nvmrc") && existsSync("package.json")) {
  const nodeVersion = readText(".nvmrc").trim();
  const nodeMajor = getNodeMajor(nodeVersion);
  const packageJson = readJson("package.json");

  if (nodeMajor !== 22) {
    failures.push(`.nvmrc must pin a Node.js 22.x runtime; found ${nodeVersion}`);
  }

  if (packageJson.engines?.node !== ">=22 <23") {
    failures.push('package.json engines.node must be ">=22 <23"');
  }

  if (packageJson.engines?.npm !== ">=10 <11") {
    failures.push('package.json engines.npm must be ">=10 <11"');
  }

  if (packageJson.packageManager !== "npm@10.9.2") {
    failures.push('package.json packageManager must be "npm@10.9.2"');
  }

  if (packageJson.private !== true) {
    failures.push("package.json must stay private while NoteSense is deployed as an app repo");
  }
}

const trackedFiles = getTrackedFiles();
const forbiddenTrackedFiles = [];

for (const file of trackedFiles) {
  const forbidden = FORBIDDEN_TRACKED_PATHS.find(({ pattern }) => pattern.test(file));
  if (forbidden) {
    forbiddenTrackedFiles.push(`${file} (${forbidden.description})`);
  }
}

if (forbiddenTrackedFiles.length > 0) {
  failures.push(`forbidden generated/local files are tracked: ${forbiddenTrackedFiles.join(", ")}`);
}

console.log(`- required files checked: ${REQUIRED_FILES.length}`);
console.log(`- .gitignore entries checked: ${REQUIRED_GITIGNORE_ENTRIES.length}`);
console.log(`- .prettierignore entries checked: ${REQUIRED_PRETTIERIGNORE_ENTRIES.length}`);
console.log(`- tracked files checked: ${trackedFiles.length}`);

if (failures.length > 0) {
  console.error("\nRepository hygiene failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Repository hygiene passed.");

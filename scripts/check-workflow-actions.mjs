import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const WORKFLOW_DIR = ".github/workflows";
const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/;
const USES_PATTERN = /^\s*uses:\s*([^#\s]+)(?:\s+#\s*(.+))?\s*$/;
const CODEQL_ACTION_STEPS = ["github/codeql-action/init", "github/codeql-action/analyze"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getLineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function getWorkflowFiles() {
  assert(existsSync(WORKFLOW_DIR), `${WORKFLOW_DIR} does not exist`);

  return readdirSync(WORKFLOW_DIR)
    .filter((file) => [".yml", ".yaml"].includes(extname(file)))
    .map((file) => join(WORKFLOW_DIR, file))
    .sort();
}

function parseUsesReference(reference) {
  const atIndex = reference.lastIndexOf("@");
  if (atIndex === -1) {
    return { action: reference, ref: "" };
  }

  return {
    action: reference.slice(0, atIndex),
    ref: reference.slice(atIndex + 1),
  };
}

function isLocalActionReference(reference) {
  return reference.startsWith("./") || reference.startsWith("../");
}

console.log("Workflow action policy report");

const failures = [];
const pinnedActions = [];
const codeqlActionPins = new Map();
const workflowFiles = getWorkflowFiles();

for (const file of workflowFiles) {
  const content = readFileSync(file, "utf8");
  const matches = [...content.matchAll(new RegExp(USES_PATTERN, "gm"))];

  for (const match of matches) {
    const reference = match[1] ?? "";
    const versionComment = match[2] ?? "";
    const lineNumber = getLineNumber(content, match.index ?? 0);

    if (isLocalActionReference(reference)) {
      pinnedActions.push(`${file}:${lineNumber} ${reference}`);
      continue;
    }

    const { action, ref } = parseUsesReference(reference);

    if (!action.includes("/")) {
      failures.push(`${file}:${lineNumber} uses invalid action reference ${reference}`);
      continue;
    }

    if (!FULL_SHA_PATTERN.test(ref)) {
      failures.push(`${file}:${lineNumber} must pin ${action} to a full 40-character commit SHA`);
      continue;
    }

    if (!versionComment.trim()) {
      failures.push(`${file}:${lineNumber} must document the source version tag in a comment`);
      continue;
    }

    if (CODEQL_ACTION_STEPS.includes(action)) {
      const locations = codeqlActionPins.get(action) ?? [];
      locations.push(`${file}:${lineNumber} ${action}@${ref}`);
      codeqlActionPins.set(action, locations);
    }

    pinnedActions.push(`${file}:${lineNumber} ${action}@${ref} (${versionComment.trim()})`);
  }
}

assert(pinnedActions.length > 0, "No GitHub Actions references were found to verify");

const seenCodeqlActions = [...codeqlActionPins.keys()];
if (seenCodeqlActions.length > 0) {
  for (const action of CODEQL_ACTION_STEPS) {
    if (!codeqlActionPins.has(action)) {
      failures.push(`CodeQL workflow action policy found ${seenCodeqlActions.join(", ")} but not ${action}`);
    }
  }

  const codeqlRefs = new Set(
    [...codeqlActionPins.values()].flat().map((location) => location.slice(location.lastIndexOf("@") + 1)),
  );

  if (codeqlRefs.size > 1) {
    failures.push(
      `CodeQL init and analyze actions must use the same pinned SHA: ${[...codeqlActionPins.values()].flat().join("; ")}`,
    );
  }
}

console.log(`- workflow files checked: ${workflowFiles.length}`);
console.log(`- action references checked: ${pinnedActions.length}`);
console.log(`- CodeQL action steps checked: ${seenCodeqlActions.length}`);

if (failures.length > 0) {
  console.error("\nWorkflow action policy failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Workflow action policy passed.");

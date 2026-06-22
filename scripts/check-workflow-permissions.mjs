import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const WORKFLOW_DIR = ".github/workflows";
const EXPECTED_PERMISSIONS = {
  ".github/workflows/ci.yml": {
    jobs: {},
    topLevel: { contents: "read" },
  },
  ".github/workflows/codeql.yml": {
    jobs: {},
    topLevel: { actions: "read", contents: "read", "security-events": "write" },
  },
  ".github/workflows/dependency-review.yml": {
    jobs: {},
    topLevel: { contents: "read" },
  },
  ".github/workflows/deploy-pages.yml": {
    jobs: {
      build: { contents: "read" },
      deploy: { "id-token": "write", pages: "write" },
      "verify-live": { contents: "read" },
    },
    topLevel: {},
  },
  ".github/workflows/lighthouse.yml": {
    jobs: {},
    topLevel: { contents: "read" },
  },
  ".github/workflows/visual-regression.yml": {
    jobs: {},
    topLevel: { contents: "read" },
  },
};
const PERMISSIONS_PATTERN = /^(\s*)permissions:\s*(.*)$/;
const PERMISSION_ENTRY_PATTERN = /^(\s+)([a-z-]+):\s*(read|write|none)\s*$/;
const JOB_ID_PATTERN = /^ {2}([A-Za-z0-9_-]+):\s*$/;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getWorkflowFiles() {
  assert(existsSync(WORKFLOW_DIR), `${WORKFLOW_DIR} does not exist`);

  return readdirSync(WORKFLOW_DIR)
    .filter((file) => [".yml", ".yaml"].includes(extname(file)))
    .map((file) => join(WORKFLOW_DIR, file))
    .sort();
}

function normalizePath(file) {
  return file.replaceAll("\\", "/");
}

function getLineNumber(index) {
  return index + 1;
}

function parseInlinePermissions(value, file, lineNumber, failures) {
  if (value === "{}") {
    return {};
  }

  if (value === "read-all" || value === "write-all") {
    failures.push(`${file}:${lineNumber} must not use broad workflow permissions: ${value}`);
    return {};
  }

  if (value) {
    failures.push(`${file}:${lineNumber} uses unsupported inline permissions syntax`);
  }

  return {};
}

function parsePermissionBlock(lines, startIndex, indent, inlineValue, file, failures) {
  const lineNumber = getLineNumber(startIndex);
  const trimmedInlineValue = inlineValue.trim();

  if (trimmedInlineValue) {
    return parseInlinePermissions(trimmedInlineValue, file, lineNumber, failures);
  }

  const permissions = {};

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    const lineIndent = line.match(/^\s*/)?.[0].length ?? 0;
    if (lineIndent <= indent) {
      break;
    }

    const entry = line.match(PERMISSION_ENTRY_PATTERN);
    if (!entry) {
      failures.push(`${file}:${getLineNumber(index)} uses unsupported permissions syntax`);
      continue;
    }

    const entryIndent = entry[1]?.length ?? 0;
    if (entryIndent !== indent + 2) {
      failures.push(`${file}:${getLineNumber(index)} must indent permission entries two spaces under permissions`);
      continue;
    }

    const permissionName = entry[2] ?? "";
    const permissionValue = entry[3] ?? "";
    permissions[permissionName] = permissionValue;
  }

  return permissions;
}

function findNearestJobId(lines, startIndex) {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const jobMatch = lines[index].match(JOB_ID_PATTERN);
    if (jobMatch) {
      return jobMatch[1] ?? "";
    }
  }

  return "";
}

function parseWorkflowPermissions(file, failures) {
  const lines = readFileSync(file, "utf8").split("\n");
  const topLevelPermissions = [];
  const jobPermissions = {};

  for (const [index, line] of lines.entries()) {
    const match = line.match(PERMISSIONS_PATTERN);
    if (!match) {
      continue;
    }

    const indent = match[1]?.length ?? 0;
    const inlineValue = match[2] ?? "";
    const permissions = parsePermissionBlock(lines, index, indent, inlineValue, file, failures);

    if (indent === 0) {
      topLevelPermissions.push({ line: getLineNumber(index), permissions });
      continue;
    }

    const jobId = findNearestJobId(lines, index);
    if (!jobId) {
      failures.push(`${file}:${getLineNumber(index)} has job permissions outside a named job`);
      continue;
    }

    jobPermissions[jobId] = { line: getLineNumber(index), permissions };
  }

  return { jobPermissions, topLevelPermissions };
}

function describePermissions(permissions) {
  const entries = Object.entries(permissions);

  if (entries.length === 0) {
    return "{}";
  }

  return entries.map(([permission, value]) => `${permission}:${value}`).join(", ");
}

function comparePermissionMap(file, scope, actual, expected, failures) {
  const actualEntries = Object.entries(actual).sort(([a], [b]) => a.localeCompare(b));
  const expectedEntries = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b));

  if (JSON.stringify(actualEntries) === JSON.stringify(expectedEntries)) {
    return;
  }

  failures.push(
    `${file} ${scope} permissions must be ${describePermissions(expected)}; found ${describePermissions(actual)}`,
  );
}

console.log("Workflow permissions policy report");

const failures = [];
const workflowFiles = getWorkflowFiles().map(normalizePath);
const expectedFiles = Object.keys(EXPECTED_PERMISSIONS).sort();
const checkedScopes = [];

for (const expectedFile of expectedFiles) {
  if (!workflowFiles.includes(expectedFile)) {
    failures.push(`${expectedFile} is missing from ${WORKFLOW_DIR}`);
  }
}

for (const file of workflowFiles) {
  const expected = EXPECTED_PERMISSIONS[file];

  if (!expected) {
    failures.push(`${file} must be added to the workflow permissions policy`);
    continue;
  }

  const { jobPermissions, topLevelPermissions } = parseWorkflowPermissions(file, failures);

  if (topLevelPermissions.length !== 1) {
    failures.push(`${file} must declare exactly one top-level permissions block`);
    continue;
  }

  comparePermissionMap(file, "top-level", topLevelPermissions[0].permissions, expected.topLevel, failures);
  checkedScopes.push(`${file}:top-level`);

  const expectedJobIds = Object.keys(expected.jobs).sort();
  const actualJobIds = Object.keys(jobPermissions).sort();

  for (const jobId of expectedJobIds) {
    if (!jobPermissions[jobId]) {
      failures.push(`${file} job ${jobId} must declare explicit permissions`);
      continue;
    }

    comparePermissionMap(file, `job ${jobId}`, jobPermissions[jobId].permissions, expected.jobs[jobId], failures);
    checkedScopes.push(`${file}:${jobId}`);
  }

  for (const jobId of actualJobIds) {
    if (!expected.jobs[jobId]) {
      failures.push(`${file} job ${jobId} declares permissions that are not in the reviewed policy`);
    }
  }
}

console.log(`- workflow files checked: ${workflowFiles.length}`);
console.log(`- permission scopes checked: ${checkedScopes.length}`);

if (failures.length > 0) {
  console.error("\nWorkflow permissions policy failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Workflow permissions policy passed.");

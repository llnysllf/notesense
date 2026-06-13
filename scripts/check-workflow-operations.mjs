import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const WORKFLOW_DIR = ".github/workflows";
const MAX_TIMEOUT_MINUTES = 20;
const MAX_ARTIFACT_RETENTION_DAYS = 14;
const JOB_ID_PATTERN = /^ {2}([A-Za-z0-9_-]+):\s*$/;
const TOP_LEVEL_CONCURRENCY_PATTERN = /^concurrency:\s*(.*)$/;
const CONCURRENCY_ENTRY_PATTERN = /^ {2}(group|cancel-in-progress):\s*(.+)\s*$/;
const TIMEOUT_PATTERN = /^ {4}timeout-minutes:\s*(\d+)\s*$/;
const UPLOAD_ARTIFACT_PATTERN = /^(\s*)uses:\s*actions\/upload-artifact@/;
const RETENTION_DAYS_PATTERN = /^\s*retention-days:\s*(\d+)\s*$/;
const IF_NO_FILES_FOUND_PATTERN = /^\s*if-no-files-found:\s*(\S+)\s*$/;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getWorkflowFiles() {
  assert(existsSync(WORKFLOW_DIR), `${WORKFLOW_DIR} does not exist`);

  return readdirSync(WORKFLOW_DIR)
    .filter((file) => [".yml", ".yaml"].includes(extname(file)))
    .map((file) => join(WORKFLOW_DIR, file).replaceAll("\\", "/"))
    .sort();
}

function getLineNumber(index) {
  return index + 1;
}

function getIndent(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function parseTopLevelConcurrency(file, lines, failures) {
  const concurrencyBlocks = [];

  for (const [index, line] of lines.entries()) {
    const match = line.match(TOP_LEVEL_CONCURRENCY_PATTERN);
    if (!match) {
      continue;
    }

    concurrencyBlocks.push({
      inlineValue: match[1]?.trim() ?? "",
      lineNumber: getLineNumber(index),
      startIndex: index,
    });
  }

  if (concurrencyBlocks.length !== 1) {
    failures.push(`${file} must declare exactly one top-level concurrency block`);
    return false;
  }

  const block = concurrencyBlocks[0];
  if (!block) {
    return false;
  }

  if (block.inlineValue) {
    failures.push(`${file}:${block.lineNumber} must use a block concurrency policy`);
    return false;
  }

  const entries = {};

  for (let index = block.startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    if (getIndent(line) === 0) {
      break;
    }

    const entry = line.match(CONCURRENCY_ENTRY_PATTERN);
    if (!entry) {
      failures.push(`${file}:${getLineNumber(index)} uses unsupported concurrency syntax`);
      continue;
    }

    const key = entry[1] ?? "";
    const value = entry[2]?.trim() ?? "";
    entries[key] = value;
  }

  if (!entries.group) {
    failures.push(`${file}:${block.lineNumber} concurrency must include a non-empty group`);
  }

  if (entries["cancel-in-progress"] !== "true") {
    failures.push(`${file}:${block.lineNumber} concurrency must set cancel-in-progress: true`);
  }

  return Boolean(entries.group) && entries["cancel-in-progress"] === "true";
}

function getJobBlocks(lines) {
  const blocks = [];
  const jobsIndex = lines.findIndex((line) => line === "jobs:");

  if (jobsIndex === -1) {
    return blocks;
  }

  for (let index = jobsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() && getIndent(line) === 0) {
      break;
    }

    const match = line.match(JOB_ID_PATTERN);
    if (!match) {
      continue;
    }

    const nextJobIndex = lines.findIndex((candidate, candidateIndex) => {
      return candidateIndex > index && JOB_ID_PATTERN.test(candidate);
    });

    blocks.push({
      id: match[1] ?? "",
      lines: lines.slice(index, nextJobIndex === -1 ? undefined : nextJobIndex),
      lineNumber: getLineNumber(index),
    });
  }

  return blocks;
}

function checkJobTimeouts(file, lines, failures) {
  const jobBlocks = getJobBlocks(lines);
  let checkedJobs = 0;

  if (jobBlocks.length === 0) {
    failures.push(`${file} must declare at least one job`);
    return checkedJobs;
  }

  for (const job of jobBlocks) {
    const timeoutMatches = job.lines
      .map((line, index) => ({ index, match: line.match(TIMEOUT_PATTERN) }))
      .filter(({ match }) => Boolean(match));

    if (timeoutMatches.length !== 1) {
      failures.push(`${file}:${job.lineNumber} job ${job.id} must declare exactly one timeout-minutes value`);
      continue;
    }

    const timeoutMatch = timeoutMatches[0];
    const timeoutMinutes = Number(timeoutMatch?.match?.[1]);

    if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > MAX_TIMEOUT_MINUTES) {
      failures.push(
        `${file}:${job.lineNumber} job ${job.id} timeout-minutes must be between 1 and ${MAX_TIMEOUT_MINUTES}`,
      );
      continue;
    }

    checkedJobs += 1;
  }

  return checkedJobs;
}

function getStepBlock(lines, usesIndex, usesIndent) {
  const stepIndent = Math.max(0, usesIndent - 2);
  const block = [];

  for (let index = usesIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() && getIndent(line) <= stepIndent) {
      break;
    }

    block.push({ index, line });
  }

  return block;
}

function checkArtifactRetention(file, lines, failures) {
  let checkedArtifactUploads = 0;

  for (const [index, line] of lines.entries()) {
    const uploadArtifactMatch = line.match(UPLOAD_ARTIFACT_PATTERN);
    if (!uploadArtifactMatch) {
      continue;
    }

    const stepBlock = getStepBlock(lines, index, uploadArtifactMatch[1]?.length ?? 0);
    const retention = stepBlock
      .map(({ index: lineIndex, line: blockLine }) => ({
        lineIndex,
        match: blockLine.match(RETENTION_DAYS_PATTERN),
      }))
      .find(({ match }) => Boolean(match));
    const ifNoFilesFound = stepBlock
      .map(({ index: lineIndex, line: blockLine }) => ({
        lineIndex,
        match: blockLine.match(IF_NO_FILES_FOUND_PATTERN),
      }))
      .find(({ match }) => Boolean(match));

    if (!retention) {
      failures.push(`${file}:${getLineNumber(index)} artifact upload must set retention-days`);
      continue;
    }

    const retentionDays = Number(retention.match?.[1]);
    if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > MAX_ARTIFACT_RETENTION_DAYS) {
      failures.push(
        `${file}:${getLineNumber(retention.lineIndex)} retention-days must be between 1 and ${MAX_ARTIFACT_RETENTION_DAYS}`,
      );
      continue;
    }

    if (ifNoFilesFound?.match?.[1] !== "ignore") {
      failures.push(`${file}:${getLineNumber(index)} artifact upload must set if-no-files-found: ignore`);
      continue;
    }

    checkedArtifactUploads += 1;
  }

  return checkedArtifactUploads;
}

console.log("Workflow operations policy report");

const failures = [];
const workflowFiles = getWorkflowFiles();
let checkedConcurrencyBlocks = 0;
let checkedJobs = 0;
let checkedArtifactUploads = 0;

for (const file of workflowFiles) {
  const lines = readFileSync(file, "utf8").split("\n");

  if (parseTopLevelConcurrency(file, lines, failures)) {
    checkedConcurrencyBlocks += 1;
  }

  checkedJobs += checkJobTimeouts(file, lines, failures);
  checkedArtifactUploads += checkArtifactRetention(file, lines, failures);
}

console.log(`- workflow files checked: ${workflowFiles.length}`);
console.log(`- concurrency blocks checked: ${checkedConcurrencyBlocks}`);
console.log(`- job timeouts checked: ${checkedJobs}`);
console.log(`- artifact uploads checked: ${checkedArtifactUploads}`);

if (failures.length > 0) {
  console.error("\nWorkflow operations policy failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Workflow operations policy passed.");

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

if (!packageJson.scripts?.check?.includes("npm run content:check")) {
  console.error("package.json check must run content:check.");
  process.exit(1);
}

// Content generators are TypeScript modules, so this gate runs their focused
// Vitest suite rather than maintaining a second, lossy JavaScript loader.
const result = spawnSync(
  "npx",
  [
    "vitest",
    "run",
    "shared/src/exercises/exerciseDefinition.test.ts",
    "shared/src/exercises/answer.test.ts",
    "shared/src/exercises/validation.test.ts",
    "shared/src/exercises/generator.test.ts",
    "shared/src/exercises/generators/generators.test.ts",
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) process.exit(result.status ?? 1);

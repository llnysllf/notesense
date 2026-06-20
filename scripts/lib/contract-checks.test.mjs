import { describe, expect, it } from "vitest";
import {
  formatMarkdownHeadingExpectation,
  getMarkdownHeadings,
  hasMarkdownHeading,
  hasPackageScript,
  includesContractSnippet,
  missingMarkdownHeadings,
  normalizeContractSnippet,
  normalizeMarkdownHeading,
  packageScriptRuns,
} from "./contract-checks.mjs";

describe("contract-check helpers", () => {
  it("normalizes repeated whitespace before comparing snippets", () => {
    expect(normalizeContractSnippet("Alpha\n\n  beta\tgamma")).toBe("Alpha beta gamma");
  });

  it("matches contract snippets across harmless formatting changes", () => {
    expect(
      includesContractSnippet("The release gate\n  runs npm run verify.", "release gate runs npm run verify"),
    ).toBe(true);
  });

  it("still rejects missing contract text", () => {
    expect(includesContractSnippet("The release gate runs npm run verify.", "manual rollback evidence")).toBe(false);
  });

  it("normalizes Markdown headings without depending on closing hash style", () => {
    expect(normalizeMarkdownHeading("Product Standard ###")).toBe("Product Standard");
  });

  it("extracts Markdown headings with depth and source line", () => {
    expect(getMarkdownHeadings("# Title\n\nText\n## Product Standard ###")).toEqual([
      { depth: 1, line: 1, text: "Title" },
      { depth: 2, line: 4, text: "Product Standard" },
    ]);
  });

  it("matches Markdown headings structurally instead of as prose snippets", () => {
    const content = "# Contract\n\n## Product Standard ###\n\nThe body can change.";

    expect(hasMarkdownHeading(content, { depth: 2, text: "Product Standard" })).toBe(true);
    expect(hasMarkdownHeading(content, { depth: 3, text: "Product Standard" })).toBe(false);
  });

  it("reports missing Markdown headings in their original expectation shape", () => {
    const missing = missingMarkdownHeadings("# Contract", [
      { depth: 1, text: "Contract" },
      { depth: 2, text: "Verification" },
    ]);

    expect(missing.map(formatMarkdownHeadingExpectation)).toEqual(["## Verification"]);
  });

  it("checks package scripts from parsed package metadata", () => {
    const packageJson = JSON.stringify({
      scripts: {
        "observability:check": "node scripts/check-observability-contract.mjs",
      },
    });

    expect(hasPackageScript(packageJson, "observability:check", "node scripts/check-observability-contract.mjs")).toBe(
      true,
    );
    expect(hasPackageScript(packageJson, "observability:check", "node scripts/other.mjs")).toBe(false);
  });

  it("checks composite npm script membership without substring matches", () => {
    const packageJson = JSON.stringify({
      scripts: {
        check: "npm run product:learning-extra && npm run observability:check && npm run test",
      },
    });

    expect(packageScriptRuns(packageJson, "check", "observability:check")).toBe(true);
    expect(packageScriptRuns(packageJson, "check", "product:learning")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { includesContractSnippet, normalizeContractSnippet } from "./contract-checks.mjs";

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
});

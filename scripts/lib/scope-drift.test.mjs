import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findScopeDrift, parseScopeSections, parseScopeTerms } from "./scope-drift.mjs";

const CAPABILITY_SOURCE = readFileSync("shared/src/marketing/capability.ts", "utf8");
const SCOPE_DOC = readFileSync("docs/PRODUCT_SCOPE.md", "utf8");

const doc = (supported, outOfScope) =>
  `# Product Scope Contract\n\n## Current Supported Scope\n\n${supported}\n\n## Explicitly Out Of Scope\n\n${outOfScope}\n\n## Foundation-First Rule\n\nnot part of either section\n`;

describe("reading the scope terms out of the capability table", () => {
  it("finds one for every capability that ships", () => {
    const terms = parseScopeTerms(CAPABILITY_SOURCE);

    expect(terms.length).toBeGreaterThanOrEqual(13);
    expect(terms).toContain("MIDI import");
    expect(terms).toContain("Web MIDI input");
  });

  it("returns nothing rather than throwing when there are none", () => {
    expect(parseScopeTerms("export const CAPABILITIES = [];")).toEqual([]);
  });
});

describe("splitting the document into the sections that matter", () => {
  it("reads each section up to the next heading", () => {
    const sections = parseScopeSections(doc("- rhythm drills", "- cloud sync"));

    expect(sections.supported).toContain("rhythm drills");
    expect(sections.supported).not.toContain("cloud sync");
    expect(sections.outOfScope).toContain("cloud sync");
    // The section ends at the next heading, not at the end of the file.
    expect(sections.outOfScope).not.toContain("not part of either section");
  });

  it("gives an empty section for a heading that is not there", () => {
    expect(parseScopeSections("# Nothing here")).toEqual({ supported: "", outOfScope: "" });
  });
});

describe("catching the drift that actually happened", () => {
  it("fails when a shipped feature is still listed as a non-goal", () => {
    // The real state of the repository for four slices.
    const problems = findScopeDrift(
      ["MIDI import"],
      parseScopeSections(doc("- MIDI import from a local file", "- MIDI import, MIDI device input")),
    );

    expect(problems).toContain('"MIDI import" ships, but ## Explicitly Out Of Scope still lists it as a non-goal');
  });

  it("fails when a shipped feature is described nowhere", () => {
    const problems = findScopeDrift(["sound worlds"], parseScopeSections(doc("- note reading", "- cloud sync")));

    expect(problems).toContain('"sound worlds" ships, but ## Current Supported Scope does not mention it');
  });

  it("ignores case, so a heading and a sentence can differ", () => {
    expect(
      findScopeDrift(["Reading Score"], parseScopeSections(doc("- reading score sittings", "- payments"))),
    ).toEqual([]);
  });

  it("passes a document that matches the product", () => {
    expect(
      findScopeDrift(
        ["note reading", "MIDI import"],
        parseScopeSections(doc("- note reading\n- MIDI import", "- payments")),
      ),
    ).toEqual([]);
  });
});

describe("the scope document as it stands", () => {
  it("says everything the product ships, and calls none of it a non-goal", () => {
    // The check the gate runs, run here too so a failure names the term rather
    // than only failing a shell script.
    expect(findScopeDrift(parseScopeTerms(CAPABILITY_SOURCE), parseScopeSections(SCOPE_DOC))).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { evaluateAuditReport } from "./audit-policy.mjs";

const advisory = {
  severity: "high",
  title: "brace-expansion denial of service",
  url: "https://github.com/advisories/GHSA-mh99-v99m-4gvg",
};

const policy = {
  exceptions: [
    {
      package: "brace-expansion",
      advisory: "GHSA-mh99-v99m-4gvg",
      devOnly: true,
      expiresOn: "2026-08-15",
      reason: "No patched release exists for the build-only v1 and v2 dependency lines.",
    },
  ],
};

const now = new Date("2026-07-25T00:00:00Z");

function report(vulnerabilities) {
  return { vulnerabilities };
}

function lockfile(packages) {
  return { packages };
}

describe("npm audit exception policy", () => {
  it("allows the named advisory only when every affected node is dev-only", () => {
    const result = evaluateAuditReport(
      report({
        "brace-expansion": {
          severity: "high",
          via: [advisory],
          nodes: ["node_modules/brace-expansion"],
        },
      }),
      lockfile({ "node_modules/brace-expansion": { dev: true } }),
      policy,
      now,
    );

    expect(result.blocked).toHaveLength(0);
    expect(result.ignored.map(([name]) => name)).toEqual(["brace-expansion"]);
  });

  it("keeps the advisory blocking when it reaches a runtime dependency", () => {
    const result = evaluateAuditReport(
      report({
        "brace-expansion": {
          severity: "high",
          via: [advisory],
          nodes: ["node_modules/brace-expansion"],
        },
      }),
      lockfile({ "node_modules/brace-expansion": { dev: false } }),
      policy,
      now,
    );

    expect(result.blocked.map(([name]) => name)).toEqual(["brace-expansion"]);
  });

  it("allows dev-only parent findings caused solely by an allowed advisory", () => {
    const result = evaluateAuditReport(
      report({
        "brace-expansion": {
          severity: "high",
          via: [advisory],
          nodes: ["node_modules/brace-expansion"],
        },
        minimatch: {
          severity: "high",
          via: ["brace-expansion"],
          nodes: ["node_modules/minimatch"],
        },
      }),
      lockfile({
        "node_modules/brace-expansion": { dev: true },
        "node_modules/minimatch": { dev: true },
      }),
      policy,
      now,
    );

    expect(result.blocked).toHaveLength(0);
    expect(result.ignored.map(([name]) => name)).toEqual(["brace-expansion", "minimatch"]);
  });

  it("does not hide unrelated high-severity advisories", () => {
    const result = evaluateAuditReport(
      report({
        other: {
          severity: "high",
          via: [
            {
              severity: "high",
              title: "unrelated advisory",
              url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
            },
          ],
          nodes: ["node_modules/other"],
        },
      }),
      lockfile({ "node_modules/other": { dev: true } }),
      policy,
      now,
    );

    expect(result.blocked.map(([name]) => name)).toEqual(["other"]);
  });

  it("stops allowing an exception after its expiry date", () => {
    const result = evaluateAuditReport(
      report({
        "brace-expansion": {
          severity: "high",
          via: [advisory],
          nodes: ["node_modules/brace-expansion"],
        },
      }),
      lockfile({ "node_modules/brace-expansion": { dev: true } }),
      policy,
      new Date("2026-08-16T00:00:00Z"),
    );

    expect(result.blocked.map(([name]) => name)).toEqual(["brace-expansion"]);
  });
});

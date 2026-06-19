import type { ErrorInfo } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderFailureReport, reportRenderFailure } from "./observability";

const errorInfo = {
  componentStack: `
    at BrokenPanel
    at App
  `,
} as ErrorInfo;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("observability", () => {
  it("creates a bounded render-failure report without app data fields", () => {
    const error = new TypeError(`Broken render ${"x".repeat(3000)}`);
    error.stack = "TypeError: Broken render\n  at BrokenPanel";

    const report = createRenderFailureReport(error, errorInfo, new Date("2026-06-19T01:00:00.000Z"));

    expect(report).toMatchObject({
      type: "render_failure",
      name: "TypeError",
      reportedAt: "2026-06-19T01:00:00.000Z",
      stack: "TypeError: Broken render at BrokenPanel",
      componentStack: "at BrokenPanel at App",
    });
    expect(report.message).toHaveLength(2000);
    expect(JSON.stringify(report)).not.toContain("localStorage");
  });

  it("falls back when error details are empty", () => {
    const error = new Error("");
    error.name = "";

    expect(createRenderFailureReport(error, {} as ErrorInfo, new Date("2026-06-19T01:00:00.000Z"))).toMatchObject({
      name: "Error",
      message: "Unknown render failure",
    });
  });

  it("logs the structured render-failure report locally", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    reportRenderFailure(new Error("Render failed"), errorInfo);

    expect(consoleError).toHaveBeenCalledWith(
      "NoteSense render failure",
      expect.objectContaining({ type: "render_failure", message: "Render failed" }),
    );
  });
});

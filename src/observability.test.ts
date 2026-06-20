import type { ErrorInfo } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRenderFailureReport,
  createRuntimeFailureReport,
  createUnhandledRejectionReport,
  installRuntimeFailureReporting,
  reportRenderFailure,
  reportRuntimeFailure,
  reportUnhandledRejection,
} from "./observability";

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

  it("creates bounded runtime-failure reports from uncaught errors", () => {
    const error = new ReferenceError(`Runtime failed ${"x".repeat(3000)}`);
    error.stack = "ReferenceError: Runtime failed\n  at Window";

    const report = createRuntimeFailureReport(error, new Date("2026-06-20T01:00:00.000Z"));

    expect(report).toMatchObject({
      type: "runtime_error",
      name: "ReferenceError",
      reportedAt: "2026-06-20T01:00:00.000Z",
      stack: "ReferenceError: Runtime failed at Window",
    });
    expect(report.message).toHaveLength(2000);
    expect(JSON.stringify(report)).not.toContain("localStorage");
  });

  it("creates unhandled-rejection reports without serializing arbitrary objects", () => {
    const report = createUnhandledRejectionReport(
      { message: "contains practice data", localStorage: "should not be serialized" },
      new Date("2026-06-20T01:00:00.000Z"),
    );

    expect(report).toEqual({
      type: "unhandled_rejection",
      name: "UnhandledRejection",
      message: "Unknown unhandled rejection",
      reportedAt: "2026-06-20T01:00:00.000Z",
    });
    expect(JSON.stringify(report)).not.toContain("practice data");
    expect(JSON.stringify(report)).not.toContain("localStorage");
  });

  it("logs runtime and unhandled-rejection reports locally", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    reportRuntimeFailure(new Error("Runtime failed"));
    reportUnhandledRejection("Promise failed");

    expect(consoleError).toHaveBeenCalledWith(
      "NoteSense runtime failure",
      expect.objectContaining({ type: "runtime_error", message: "Runtime failed" }),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "NoteSense unhandled rejection",
      expect.objectContaining({ type: "unhandled_rejection", message: "Promise failed" }),
    );
  });

  it("installs removable global runtime-failure listeners", () => {
    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === "function") {
          listeners.set(type, listener);
        }
      }),
      removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (listeners.get(type) === listener) {
          listeners.delete(type);
        }
      }),
    } as unknown as Pick<Window, "addEventListener" | "removeEventListener">;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const uninstall = installRuntimeFailureReporting(target);
    listeners.get("error")?.({ error: new Error("Window broke"), message: "Window broke" } as ErrorEvent);
    listeners.get("unhandledrejection")?.({ reason: new Error("Promise broke") } as PromiseRejectionEvent);
    uninstall();

    expect(target.addEventListener).toHaveBeenCalledWith("error", expect.any(Function));
    expect(target.addEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    expect(consoleError).toHaveBeenCalledWith(
      "NoteSense runtime failure",
      expect.objectContaining({ type: "runtime_error", message: "Window broke" }),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "NoteSense unhandled rejection",
      expect.objectContaining({ type: "unhandled_rejection", message: "Promise broke" }),
    );
    expect(listeners.size).toBe(0);
  });
});

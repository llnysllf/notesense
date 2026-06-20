import type { ErrorInfo } from "react";

const MAX_REPORT_TEXT_LENGTH = 2000;

type LocalFailureType = "render_failure" | "runtime_error" | "unhandled_rejection";

type LocalFailureDetails = Readonly<{
  name: string;
  message: string;
  stack?: string;
}>;

export type RenderFailureReport = Readonly<{
  type: "render_failure";
  name: string;
  message: string;
  reportedAt: string;
  stack?: string;
  componentStack?: string;
}>;

export type RuntimeFailureReport = Readonly<{
  type: "runtime_error";
  name: string;
  message: string;
  reportedAt: string;
  stack?: string;
}>;

export type UnhandledRejectionReport = Readonly<{
  type: "unhandled_rejection";
  name: string;
  message: string;
  reportedAt: string;
  stack?: string;
}>;

export type LocalFailureReport = RenderFailureReport | RuntimeFailureReport | UnhandledRejectionReport;

function sanitizeReportText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_REPORT_TEXT_LENGTH);
}

function getErrorLikeDetails(value: unknown, fallbackName: string, fallbackMessage: string): LocalFailureDetails {
  if (value instanceof Error) {
    const stack = sanitizeReportText(value.stack);

    return {
      name: sanitizeReportText(value.name) ?? fallbackName,
      message: sanitizeReportText(value.message) ?? fallbackMessage,
      ...(stack ? { stack } : {}),
    };
  }

  if (typeof value === "string") {
    return {
      name: fallbackName,
      message: sanitizeReportText(value) ?? fallbackMessage,
    };
  }

  return {
    name: fallbackName,
    message: fallbackMessage,
  };
}

function createLocalFailureReport(
  type: LocalFailureType,
  details: LocalFailureDetails,
  reportedAt: Date,
): LocalFailureReport {
  return {
    type,
    name: details.name,
    message: details.message,
    reportedAt: reportedAt.toISOString(),
    ...(details.stack ? { stack: details.stack } : {}),
  } as LocalFailureReport;
}

export function createRenderFailureReport(
  error: Error,
  errorInfo: ErrorInfo,
  reportedAt = new Date(),
): RenderFailureReport {
  const stack = sanitizeReportText(error.stack);
  const componentStack = sanitizeReportText(errorInfo.componentStack);

  return {
    type: "render_failure",
    name: sanitizeReportText(error.name) ?? "Error",
    message: sanitizeReportText(error.message) ?? "Unknown render failure",
    reportedAt: reportedAt.toISOString(),
    ...(stack ? { stack } : {}),
    ...(componentStack ? { componentStack } : {}),
  };
}

export function createRuntimeFailureReport(error: unknown, reportedAt = new Date()): RuntimeFailureReport {
  return createLocalFailureReport(
    "runtime_error",
    getErrorLikeDetails(error, "RuntimeError", "Unknown runtime failure"),
    reportedAt,
  ) as RuntimeFailureReport;
}

export function createUnhandledRejectionReport(reason: unknown, reportedAt = new Date()): UnhandledRejectionReport {
  return createLocalFailureReport(
    "unhandled_rejection",
    getErrorLikeDetails(reason, "UnhandledRejection", "Unknown unhandled rejection"),
    reportedAt,
  ) as UnhandledRejectionReport;
}

function logLocalFailure(label: string, report: LocalFailureReport) {
  console.error(label, report);
}

export function reportRenderFailure(error: Error, errorInfo: ErrorInfo) {
  logLocalFailure("NoteSense render failure", createRenderFailureReport(error, errorInfo));
}

export function reportRuntimeFailure(error: unknown) {
  logLocalFailure("NoteSense runtime failure", createRuntimeFailureReport(error));
}

export function reportUnhandledRejection(reason: unknown) {
  logLocalFailure("NoteSense unhandled rejection", createUnhandledRejectionReport(reason));
}

export function installRuntimeFailureReporting(
  target: Pick<Window, "addEventListener" | "removeEventListener"> = window,
) {
  const handleError = (event: ErrorEvent) => {
    reportRuntimeFailure(event.error ?? event.message);
  };
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportUnhandledRejection(event.reason);
  };

  target.addEventListener("error", handleError);
  target.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    target.removeEventListener("error", handleError);
    target.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}

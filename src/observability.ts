import type { ErrorInfo } from "react";

const MAX_REPORT_TEXT_LENGTH = 2000;

export type RenderFailureReport = Readonly<{
  type: "render_failure";
  name: string;
  message: string;
  reportedAt: string;
  stack?: string;
  componentStack?: string;
}>;

function sanitizeReportText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_REPORT_TEXT_LENGTH);
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

export function reportRenderFailure(error: Error, errorInfo: ErrorInfo) {
  console.error("NoteSense render failure", createRenderFailureReport(error, errorInfo));
}

import { render, screen } from "@testing-library/react";
import type { ErrorInfo, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reportRenderFailure } from "../observability";
import ErrorBoundary from "./ErrorBoundary";

vi.mock("../observability", () => ({
  reportRenderFailure: vi.fn(),
}));

function BrokenChild(): ReactNode {
  throw new Error("Broken child");
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders children when no render error occurs", () => {
    render(
      <ErrorBoundary>
        <p>Practice shell</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Practice shell")).toBeInTheDocument();
  });

  it("shows the recovery surface and reports render failures", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(vi.mocked(reportRenderFailure)).toHaveBeenCalledWith(expect.any(Error), expect.anything() as ErrorInfo);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRoundMisses } from "./useRoundMisses";
import type { FeedbackState } from "../types";

function Probe({
  mode = "reading",
  feedback,
  expectedNoteId,
  isRunning = true,
}: {
  mode?: string;
  feedback: FeedbackState;
  expectedNoteId: string | undefined;
  isRunning?: boolean;
}) {
  const { misses, reset } = useRoundMisses({ mode, feedback, expectedNoteId, isRunning });
  return (
    <>
      <span data-testid="misses">{misses.map((m) => `${m.expectedMidi}:${m.code}`).join(",")}</span>
      <button type="button" onClick={reset}>
        reset
      </button>
    </>
  );
}

const wrong = (answerId: string): FeedbackState => ({ answer: "C", answerId, isCorrect: false });
const right = (): FeedbackState => ({ answer: "C", isCorrect: true });

describe("useRoundMisses", () => {
  it("records a miss with the shape of the error", () => {
    const { rerender } = render(<Probe feedback={null} expectedNoteId="C4" />);
    expect(screen.getByTestId("misses")).toBeEmptyDOMElement();

    rerender(<Probe feedback={wrong("D4")} expectedNoteId="C4" />);
    expect(screen.getByTestId("misses")).toHaveTextContent("60:step-slip");
  });

  it("ignores correct answers", () => {
    const { rerender } = render(<Probe feedback={null} expectedNoteId="C4" />);
    rerender(<Probe feedback={right()} expectedNoteId="C4" />);

    expect(screen.getByTestId("misses")).toBeEmptyDOMElement();
  });

  it("ignores misses outside reading practice", () => {
    const { rerender } = render(<Probe mode="pitch" feedback={null} expectedNoteId="C4" />);
    rerender(<Probe mode="pitch" feedback={wrong("D4")} expectedNoteId="C4" />);

    expect(screen.getByTestId("misses")).toBeEmptyDOMElement();
  });

  it("ignores feedback it cannot place on the keyboard", () => {
    const { rerender } = render(<Probe feedback={null} expectedNoteId="C4" />);
    rerender(<Probe feedback={{ answer: "C", isCorrect: false }} expectedNoteId="C4" />);
    expect(screen.getByTestId("misses")).toBeEmptyDOMElement();

    rerender(<Probe feedback={wrong("D4")} expectedNoteId={undefined} />);
    expect(screen.getByTestId("misses")).toBeEmptyDOMElement();
  });

  it("can be cleared on demand", () => {
    const { rerender } = render(<Probe feedback={null} expectedNoteId="C4" />);
    rerender(<Probe feedback={wrong("D4")} expectedNoteId="C4" />);
    expect(screen.getByTestId("misses")).toHaveTextContent("60:step-slip");

    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(screen.getByTestId("misses")).toBeEmptyDOMElement();
  });

  it("clears when a new round starts", () => {
    const { rerender } = render(<Probe feedback={null} expectedNoteId="C4" isRunning={false} />);
    rerender(<Probe feedback={wrong("D4")} expectedNoteId="C4" isRunning={false} />);
    expect(screen.getByTestId("misses")).toHaveTextContent("60:step-slip");

    rerender(<Probe feedback={wrong("D4")} expectedNoteId="C4" isRunning={true} />);
    expect(screen.getByTestId("misses")).toBeEmptyDOMElement();
  });
});

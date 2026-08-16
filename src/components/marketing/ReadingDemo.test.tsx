import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReadingDemo from "./ReadingDemo";
import type { ReadingDemoView } from "../../types";

function renderDemo(overrides: Partial<ReadingDemoView> = {}) {
  const demo: ReadingDemoView = {
    note: { id: "E4", name: "E", octave: 4, frequency: 329.63, staffY: 120, clef: "treble", keyboardShortcut: "e" },
    options: ["C", "D", "E"],
    verdict: "unanswered",
    lastAnswer: null,
    answered: 0,
    correct: 0,
    answer: vi.fn(),
    next: vi.fn(),
    ...overrides,
  };
  const action = { label: "Start practising", href: "/practice/reading" };

  return { ...render(<ReadingDemo demo={demo} action={action} />), demo, action };
}

describe("the demo on the home page", () => {
  it("says up front that nothing is being kept", () => {
    // A visitor has not agreed to anything, and the app is built on a practice
    // record that a demo must not write to.
    renderDemo();

    expect(screen.getByText(/Nothing here is saved/)).toBeVisible();
  });

  it("draws the prompt with the app's own staff", () => {
    renderDemo();

    expect(screen.getByRole("img", { name: /staff note/i })).toBeInTheDocument();
  });

  it("takes an answer", () => {
    const { demo } = renderDemo();

    fireEvent.click(screen.getByRole("button", { name: "D" }));

    expect(demo.answer).toHaveBeenCalledWith("D");
  });

  it("stops taking answers once one is given", () => {
    renderDemo({ verdict: "wrong", lastAnswer: "C" });

    expect(screen.getByRole("button", { name: "C" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "E" })).toBeDisabled();
  });

  it("names the note it was, rather than only saying wrong", () => {
    renderDemo({ verdict: "wrong", lastAnswer: "C" });

    expect(screen.getByRole("status")).toHaveTextContent("Not quite. It was E4.");
  });

  it("confirms a correct answer by name", () => {
    renderDemo({ verdict: "correct", lastAnswer: "E" });

    expect(screen.getByRole("status")).toHaveTextContent("Yes — that is E4.");
  });

  it("does not offer another note until this one is answered", () => {
    renderDemo();

    expect(screen.getByRole("button", { name: "Another note" })).toBeDisabled();
  });

  it("moves on when asked", () => {
    const { demo } = renderDemo({ verdict: "correct", lastAnswer: "E" });

    fireEvent.click(screen.getByRole("button", { name: "Another note" }));

    expect(demo.next).toHaveBeenCalled();
  });

  it("shows a running tally only once there is one", () => {
    renderDemo();
    expect(screen.queryByText(/so far/)).toBeNull();

    renderDemo({ answered: 3, correct: 2 });
    expect(screen.getByText(/2 of 3 so far/)).toBeVisible();
  });

  it("offers the real thing from inside the demo", () => {
    renderDemo();

    expect(screen.getByRole("link", { name: "Start practising" })).toHaveAttribute("href", "/practice/reading");
  });
});

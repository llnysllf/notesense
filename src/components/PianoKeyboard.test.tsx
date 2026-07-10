import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PianoKeyboard from "./PianoKeyboard";

const originalMatchMedia = window.matchMedia;

function mockMobilePianoLayout() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
      matches: query === "(max-width: 640px)",
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  });
}

function mockLegacyMobilePianoLayout() {
  const addListener = vi.fn();
  const removeListener = vi.fn();

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addListener,
      dispatchEvent: vi.fn(() => false),
      matches: query === "(max-width: 640px)",
      media: query,
      onchange: null,
      removeListener,
    })),
    writable: true,
  });

  return { addListener, removeListener };
}

afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: originalMatchMedia,
    writable: true,
  });
});

describe("PianoKeyboard", () => {
  it("renders the complete 88-key piano as disabled controls before a round starts", () => {
    render(<PianoKeyboard disabled onKeySelect={vi.fn()} />);

    expect(screen.getByRole("group", { name: "88-key piano keyboard" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(88);
    expect(screen.getByRole("button", { name: "White piano key A0" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Black piano key C#4" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "White piano key C8" })).toHaveAttribute("aria-disabled", "true");
  });

  it("ignores key clicks while disabled", () => {
    const onKeySelect = vi.fn();

    render(<PianoKeyboard disabled onKeySelect={onKeySelect} />);
    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));

    expect(onKeySelect).not.toHaveBeenCalled();
  });

  it("selects the exact piano key id", () => {
    const onKeySelect = vi.fn();

    render(<PianoKeyboard disabled={false} onKeySelect={onKeySelect} />);
    fireEvent.click(screen.getByRole("button", { name: "White piano key C4" }));
    fireEvent.click(screen.getByRole("button", { name: "Black piano key C#4" }));

    expect(onKeySelect).toHaveBeenNthCalledWith(1, "C4");
    expect(onKeySelect).toHaveBeenNthCalledWith(2, "C#4");
  });

  it("highlights custom ranges and ignores unselectable keys", () => {
    const onKeySelect = vi.fn();

    render(
      <PianoKeyboard
        activeRangeEdge="start"
        disabled={false}
        rangeEndNoteId="C4"
        rangeNoteIds={new Set(["G3", "A3", "B3", "C4"])}
        rangeStartNoteId="G3"
        selectableKeyIds={new Set(["G3", "A3", "B3", "C4"])}
        onKeySelect={onKeySelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /White piano key G3/ }));
    fireEvent.click(screen.getByRole("button", { name: "Black piano key G#3" }));

    expect(screen.getByRole("button", { name: /White piano key G3/ })).toHaveClass(
      "range-key",
      "range-active-boundary",
    );
    expect(screen.getByRole("button", { name: /White piano key C4/ })).toHaveClass("range-key", "range-boundary");
    expect(screen.getByRole("button", { name: "Black piano key G#3" })).toHaveAttribute("aria-disabled", "true");
    expect(onKeySelect).toHaveBeenCalledTimes(1);
    expect(onKeySelect).toHaveBeenCalledWith("G3");
  });

  it("positions black keys across the full keyboard instead of stacking them", () => {
    render(<PianoKeyboard disabled onKeySelect={vi.fn()} />);

    const firstBlackKey = screen.getByRole("button", { name: "Black piano key A#0" });
    const middleBlackKey = screen.getByRole("button", { name: "Black piano key C#4" });
    const lastBlackKey = screen.getByRole("button", { name: "Black piano key A#7" });

    expect(firstBlackKey.style.getPropertyValue("--black-key-left")).not.toEqual("");
    expect(middleBlackKey.style.getPropertyValue("--black-key-left")).not.toEqual(
      firstBlackKey.style.getPropertyValue("--black-key-left"),
    );
    expect(lastBlackKey.style.getPropertyValue("--black-key-left")).not.toEqual(
      firstBlackKey.style.getPropertyValue("--black-key-left"),
    );
  });

  it("starts phone layouts around C4 without revealing a hidden target", () => {
    mockMobilePianoLayout();

    const { container } = render(<PianoKeyboard disabled={false} onKeySelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "White piano key C4" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "White piano key C6" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "White piano key A0" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").length).toBeLessThan(88);
    expect(container.querySelectorAll("[data-piano-overview-key]")).toHaveLength(88);
    expect(container.querySelector('[data-piano-overview-key="C6"]')).not.toHaveClass("overview-target");
    expect(container.querySelector('[data-piano-overview-key="C4"]')).toHaveClass("overview-window");
  });

  it("supports legacy media query listeners for phone layouts", () => {
    const listeners = mockLegacyMobilePianoLayout();

    const { unmount } = render(<PianoKeyboard disabled={false} onKeySelect={vi.fn()} />);

    expect(listeners.addListener).toHaveBeenCalledTimes(1);
    unmount();
    expect(listeners.removeListener).toHaveBeenCalledTimes(1);
  });

  it("moves the phone piano window with controls and overview clicks", () => {
    mockMobilePianoLayout();

    const { container } = render(<PianoKeyboard disabled={false} onKeySelect={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Move piano window left" }));
    expect(container.querySelector(".piano-mobile-layout")).toHaveAttribute("data-window-center-note-id", "C3");

    fireEvent.click(screen.getByRole("button", { name: "Move piano window right" }));
    fireEvent.click(screen.getByRole("button", { name: "Move piano window right" }));
    expect(screen.getByRole("button", { name: "White piano key G4" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Center piano window on C4" }));
    expect(screen.getByRole("button", { name: "White piano key C4" })).toBeInTheDocument();

    const overviewRail = screen.getByRole("button", { name: "Move piano window on full 88-key overview" });
    vi.spyOn(overviewRail, "getBoundingClientRect").mockReturnValue({
      bottom: 24,
      height: 24,
      left: 0,
      right: 880,
      top: 0,
      width: 880,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(overviewRail, { clientX: 700, detail: 1 });
    expect(container.querySelector(".piano-mobile-layout")).toHaveAttribute("data-window-center-note-id", "G6");
  });

  it("recenters on C4 when the overview rail is activated by keyboard", () => {
    mockMobilePianoLayout();

    const { container } = render(<PianoKeyboard disabled={false} onKeySelect={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Move piano window left" }));
    expect(container.querySelector(".piano-mobile-layout")).toHaveAttribute("data-window-center-note-id", "C3");

    // Keyboard activation dispatches a click with detail 0 and no coordinates.
    fireEvent.click(screen.getByRole("button", { name: "Move piano window on full 88-key overview" }), { detail: 0 });
    expect(container.querySelector(".piano-mobile-layout")).toHaveAttribute("data-window-center-note-id", "C4");
  });

  it("marks revealed and selected keys on the phone overview after feedback", () => {
    mockMobilePianoLayout();

    const { container, rerender } = render(
      <PianoKeyboard disabled isCorrect revealedNoteId="C4" selectedNoteId="C4" onKeySelect={vi.fn()} />,
    );

    expect(container.querySelector('[data-piano-overview-key="C4"]')).toHaveClass(
      "overview-target",
      "overview-selected-correct",
    );

    rerender(
      <PianoKeyboard disabled isCorrect={false} revealedNoteId="C4" selectedNoteId="C3" onKeySelect={vi.fn()} />,
    );

    expect(container.querySelector('[data-piano-overview-key="C3"]')).toHaveClass("overview-selected-wrong");
    expect(container.querySelector('[data-piano-overview-key="C4"]')).toHaveClass("overview-target");
  });

  it("marks the selected key and revealed target key after an incorrect answer", () => {
    render(<PianoKeyboard disabled isCorrect={false} revealedNoteId="C4" selectedNoteId="C3" onKeySelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "White piano key C3, selected incorrect" })).toHaveClass(
      "selected-wrong",
    );
    expect(screen.getByRole("button", { name: "White piano key C4, target note" })).toHaveClass("target-key");
  });
});

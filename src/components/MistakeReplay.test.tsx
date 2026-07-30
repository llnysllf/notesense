import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MistakeReplay from "./MistakeReplay";
import type { ReadingMiss } from "../types";

const miss = (expectedMidi: number, answeredMidi: number, code: ReadingMiss["code"]): ReadingMiss => ({
  expectedMidi,
  answeredMidi,
  code,
});

describe("MistakeReplay", () => {
  it("renders nothing after a clean round", () => {
    const { container } = render(<MistakeReplay misses={[]} onReplay={vi.fn()} />);

    // A panel announcing zero mistakes would be noise.
    expect(container).toBeEmptyDOMElement();
  });

  it("names the notes worth another look, most-missed first", () => {
    render(
      <MistakeReplay
        misses={[miss(60, 62, "step-slip"), miss(60, 62, "step-slip"), miss(65, 77, "wrong-octave")]}
        onReplay={vi.fn()}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("C4");
    expect(items[0]).toHaveTextContent("Step");
    expect(items[0]).toHaveTextContent("2x");
    expect(items[1]).toHaveTextContent("F4");
    expect(items[1]).toHaveTextContent("1x");
  });

  it("caps the list so a bad round is not a punishment queue", () => {
    const many = Array.from({ length: 9 }, (_, index) => miss(50 + index, 51 + index, "semitone-slip"));
    render(<MistakeReplay misses={many} onReplay={vi.fn()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("offers a corrective round", () => {
    const onReplay = vi.fn();
    render(<MistakeReplay misses={[miss(60, 61, "semitone-slip")]} onReplay={onReplay} />);

    fireEvent.click(screen.getByRole("button", { name: "Replay" }));

    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onReplay).toHaveBeenCalledWith([miss(60, 61, "semitone-slip")]);
  });
});

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEarSession } from "./useEarSession";

vi.mock("../earAudio", () => ({
  playStimulus: vi.fn(),
  playPitches: vi.fn(),
  stimulusGroups: vi.fn(() => []),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function sessionFor(
  family: Parameters<typeof useEarSession>[0]["family"],
  mode: "learn" | "practice" | "test" = "practice",
) {
  return renderHook(() => useEarSession({ family, mode, difficulty: 0.5 }));
}

describe("useEarSession", () => {
  it("generates an exercise for the chosen family", () => {
    const { result } = sessionFor("ear.interval");

    expect(result.current.definition?.kind).toBe("ear.interval");
    expect(result.current.result).toBeNull();
  });

  it("marks a correct named answer", () => {
    const { result } = sessionFor("ear.chord");
    const expected = result.current.definition?.expectedAnswer;
    if (expected?.kind !== "choice") throw new Error("expected a choice answer");

    act(() => result.current.submit({ kind: "choice", optionId: expected.optionId }));

    expect(result.current.result?.correct).toBe(true);
    expect(result.current.result?.score).toBe(1);
  });

  it("names the right answer after a wrong one, so the learner can learn from it", () => {
    const { result } = sessionFor("ear.chord");
    const expected = result.current.definition?.expectedAnswer;
    if (expected?.kind !== "choice") throw new Error("expected a choice answer");

    act(() => result.current.submit({ kind: "choice", optionId: "not-a-quality" }));

    expect(result.current.result?.correct).toBe(false);
    expect(result.current.result?.expectedOptionId).toBe(expected.optionId);
  });

  it("gives partial credit and positional feedback on a sequence", () => {
    const { result } = sessionFor("ear.sequence");
    const expected = result.current.definition?.expectedAnswer;
    if (expected?.kind !== "pitch-sequence") throw new Error("expected a pitch sequence");

    // Every note but the second.
    const answer = expected.midi.map((midi, index) => (index === 1 ? midi + 1 : midi));
    act(() => result.current.submit({ kind: "pitch-sequence", midi: answer }));

    expect(result.current.result?.correct).toBe(false);
    expect(result.current.result?.score).toBeGreaterThan(0.5);
    expect(result.current.result?.comparison?.firstErrorIndex).toBe(1);
    expect(result.current.result?.summary).toMatch(/Note 2/);
  });

  it("accepts an exact sequence", () => {
    const { result } = sessionFor("ear.sequence");
    const expected = result.current.definition?.expectedAnswer;
    if (expected?.kind !== "pitch-sequence") throw new Error("expected a pitch sequence");

    act(() => result.current.submit({ kind: "pitch-sequence", midi: [...expected.midi] }));

    expect(result.current.result?.correct).toBe(true);
  });

  it("grades the key centre against the note that was never played", () => {
    const { result } = sessionFor("ear.key-centre");
    const expected = result.current.definition?.expectedAnswer;
    if (expected?.kind !== "pitch") throw new Error("expected a pitch answer");

    act(() => result.current.submit({ kind: "pitch-sequence", midi: [expected.midi] }));
    expect(result.current.result?.correct).toBe(true);
  });

  it("grades a written transcription on pitch and placement", () => {
    const { result } = sessionFor("ear.transcription");
    const expected = result.current.definition?.expectedAnswer;
    if (expected?.kind !== "transcription") throw new Error("expected a transcription");

    act(() => result.current.submit({ kind: "transcription", notes: expected.notes.map((note) => ({ ...note })) }));

    expect(result.current.result?.correct).toBe(true);
    expect(result.current.result?.transcription?.rhythmAccuracy).toBe(1);
  });

  it("grades a tapped rhythm echo", () => {
    const { result } = sessionFor("ear.rhythm-echo");
    const expected = result.current.definition?.expectedAnswer;
    if (expected?.kind !== "rhythm") throw new Error("expected a rhythm answer");

    // Tap exactly on the beat at the echo tempo.
    const secondsPerTick = 60 / 80 / expected.transport.ppq;
    const onsets = expected.onsetTicks.map((ticks) => ticks * secondsPerTick);
    act(() => result.current.submit({ kind: "rhythm", onsetsSeconds: onsets, bpm: 80 }));

    expect(result.current.result?.correct).toBe(true);
    expect(result.current.result?.rhythm?.onTime).toBe(expected.onsetTicks.length);
  });

  it("says so when an answer does not fit the question", () => {
    const { result } = sessionFor("ear.chord");

    act(() => result.current.submit({ kind: "pitch-sequence", midi: [60] }));

    expect(result.current.result?.summary).toMatch(/could not be graded/i);
  });

  it("takes the first answer and ignores the rest", () => {
    const { result } = sessionFor("ear.chord");
    const expected = result.current.definition?.expectedAnswer;
    if (expected?.kind !== "choice") throw new Error("expected a choice answer");

    act(() => result.current.submit({ kind: "choice", optionId: "wrong" }));
    act(() => result.current.submit({ kind: "choice", optionId: expected.optionId }));

    expect(result.current.result?.correct).toBe(false);
  });

  it("hands out a fresh question, clearing the verdict", () => {
    const { result } = sessionFor("ear.interval");
    const first = result.current.definition?.id;

    act(() => result.current.submit({ kind: "choice", optionId: "x" }));
    act(() => result.current.next());

    expect(result.current.definition?.id).not.toBe(first);
    expect(result.current.result).toBeNull();
  });
});

describe("replay limits", () => {
  it("does not limit replays in learn mode", () => {
    const { result } = sessionFor("ear.interval", "learn");

    for (let index = 0; index < 6; index += 1) act(() => result.current.play());

    expect(result.current.canPlay).toBe(true);
    expect(result.current.replaysLeft).toBeUndefined();
  });

  it("counts practice replays down and then stops offering them", () => {
    const { result } = sessionFor("ear.sequence", "practice");

    act(() => result.current.play());
    expect(result.current.replaysLeft).toBe("3 replays left.");

    for (let index = 0; index < 3; index += 1) act(() => result.current.play());
    expect(result.current.replaysLeft).toBe("No replays left.");
    expect(result.current.canPlay).toBe(false);
  });

  it("plays a test phrase once, and not again once notes are entered", () => {
    const { result } = sessionFor("ear.sequence", "test");

    act(() => result.current.play());
    expect(result.current.canPlay).toBe(true);

    act(() => result.current.noteEntered());
    // Replaying mid-answer would measure something other than what was held.
    expect(result.current.canPlay).toBe(false);
  });

  it("gives every question a fresh listen", () => {
    const { result } = sessionFor("ear.sequence", "practice");

    for (let index = 0; index < 4; index += 1) act(() => result.current.play());
    expect(result.current.canPlay).toBe(false);

    act(() => result.current.next());
    expect(result.current.canPlay).toBe(true);
  });
});

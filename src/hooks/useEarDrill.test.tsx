import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EAR_FAMILIES, useEarDrill } from "./useEarDrill";
import { playPitches } from "../earAudio";

vi.mock("../earAudio", () => ({
  playStimulus: vi.fn(),
  playPitches: vi.fn(),
  stimulusGroups: vi.fn(() => []),
}));

// The ledger is exercised by its own tests; here it only has to not explode.
vi.mock("../evidenceLedger", () => ({
  createLiveAttemptEvent: vi.fn(() => ({ eventId: "e" })),
  recordEvidenceAttempt: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useEarDrill", () => {
  it("offers every family the slice promises", () => {
    const { result } = renderHook(() => useEarDrill());

    expect(result.current.families).toHaveLength(9);
    expect(EAR_FAMILIES.map((family) => family.id)).toContain("ear.transcription");
  });

  it("never calls a generated sequence a melody in the family list", () => {
    for (const family of EAR_FAMILIES) {
      expect(family.label.toLowerCase()).not.toContain("melody");
      expect(family.summary.toLowerCase()).not.toContain("melody");
    }
  });

  it("starts on intervals in practice mode", () => {
    const { result } = renderHook(() => useEarDrill());

    expect(result.current.family).toBe("ear.interval");
    expect(result.current.mode).toBe("practice");
    expect(result.current.session.definition?.kind).toBe("ear.interval");
  });

  it("switches family and clears anything half-entered", () => {
    const { result } = renderHook(() => useEarDrill());

    act(() => result.current.playNote("C4"));
    expect(result.current.entered).toEqual([60]);

    act(() => result.current.setFamily("ear.sequence"));

    expect(result.current.family).toBe("ear.sequence");
    // A half-built answer must not follow the learner into a new question.
    expect(result.current.entered).toEqual([]);
  });

  it("collects, undoes, and clears played notes", () => {
    const { result } = renderHook(() => useEarDrill());

    act(() => result.current.playNote("C4"));
    act(() => result.current.playNote("E4"));
    expect(result.current.entered).toEqual([60, 64]);

    act(() => result.current.undoNote());
    expect(result.current.entered).toEqual([60]);

    act(() => result.current.clearNotes());
    expect(result.current.entered).toEqual([]);
  });

  it("ignores a key that is not on the piano", () => {
    const { result } = renderHook(() => useEarDrill());

    act(() => result.current.playNote("not-a-key"));

    expect(result.current.entered).toEqual([]);
  });

  it("submits a named answer straight away", () => {
    const { result } = renderHook(() => useEarDrill());
    const expected = result.current.session.definition?.expectedAnswer;
    if (expected?.kind !== "choice") throw new Error("expected a choice answer");

    act(() => result.current.submitChoice(expected.optionId));

    expect(result.current.session.result?.correct).toBe(true);
  });

  it("submits played notes as a sequence", () => {
    const { result } = renderHook(() => useEarDrill());
    act(() => result.current.setFamily("ear.sequence"));

    const expected = result.current.session.definition?.expectedAnswer;
    if (expected?.kind !== "pitch-sequence") throw new Error("expected a pitch sequence");
    act(() => result.current.submit());

    // Nothing was entered, so nothing was right — but it still grades.
    expect(result.current.session.result).not.toBeNull();
    expect(result.current.session.result?.correct).toBe(false);
  });

  it("submits taps as a rhythm, zeroed on the first tap", () => {
    const { result } = renderHook(() => useEarDrill());
    act(() => result.current.setFamily("ear.rhythm-echo"));

    act(() => result.current.tap());
    act(() => result.current.tap());
    expect(result.current.taps).toHaveLength(2);

    act(() => result.current.submit());
    expect(result.current.session.result?.rhythm).toBeDefined();
  });

  it("submits the written phrase for transcription", () => {
    const { result } = renderHook(() => useEarDrill());
    act(() => result.current.setFamily("ear.transcription"));

    const expected = result.current.session.definition?.expectedAnswer;
    if (expected?.kind !== "transcription") throw new Error("expected a transcription");

    act(() => {
      for (const note of expected.notes) result.current.transcriber.place(note.onsetTicks, note.midi);
    });
    act(() => result.current.submit());

    expect(result.current.session.result?.correct).toBe(true);
  });

  it("gives the transcriber the phrase's own onsets to write on", () => {
    const { result } = renderHook(() => useEarDrill());
    act(() => result.current.setFamily("ear.transcription"));

    const expected = result.current.session.definition?.expectedAnswer;
    if (expected?.kind !== "transcription") throw new Error("expected a transcription");
    expect(result.current.slots).toEqual(expected.notes.map((note) => note.onsetTicks));
    // The entry range is fixed and wide: narrowing it to the phrase would tell
    // the learner how high and low the answer goes.
    expect(result.current.lowMidi).toBe(48);
    expect(result.current.highMidi).toBe(84);
    expect(result.current.lowMidi).toBeLessThan(Math.min(...expected.notes.map((note) => note.midi)));
  });

  it("plays back the answer the learner assembled", () => {
    const { result } = renderHook(() => useEarDrill());
    act(() => result.current.setFamily("ear.sequence"));
    act(() => result.current.playNote("C4"));

    act(() => result.current.playAnswer());
    expect(playPitches).toHaveBeenCalledWith([60]);
  });

  it("plays back a written transcription rather than the played-note list", () => {
    const { result } = renderHook(() => useEarDrill());
    act(() => result.current.setFamily("ear.transcription"));

    const expected = result.current.session.definition?.expectedAnswer;
    if (expected?.kind !== "transcription") throw new Error("expected a transcription");
    const first = expected.notes[0] as { midi: number; onsetTicks: number };
    act(() => result.current.transcriber.place(first.onsetTicks, first.midi));

    act(() => result.current.playAnswer());
    expect(playPitches).toHaveBeenCalledWith([first.midi]);
  });

  it("clears the editor and the entry when moving on", () => {
    const { result } = renderHook(() => useEarDrill());
    act(() => result.current.setFamily("ear.transcription"));
    const expected = result.current.session.definition?.expectedAnswer;
    if (expected?.kind !== "transcription") throw new Error("expected a transcription");
    const first = expected.notes[0] as { midi: number; onsetTicks: number };
    act(() => result.current.transcriber.place(first.onsetTicks, first.midi));
    expect(result.current.transcriber.notes).toHaveLength(1);

    act(() => result.current.session.next());

    expect(result.current.transcriber.notes).toEqual([]);
    expect(result.current.entered).toEqual([]);
  });

  it("changes mode, which changes the replay allowance", () => {
    const { result } = renderHook(() => useEarDrill());

    act(() => result.current.setMode("learn"));
    expect(result.current.mode).toBe("learn");
    expect(result.current.session.replaysLeft).toBeUndefined();
  });
});

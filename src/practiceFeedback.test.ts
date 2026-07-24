import { describe, expect, it } from "vitest";
import { getPracticeFeedbackText } from "./practiceFeedback";
import { defaultSettings } from "./storage";
import { PITCH_NOTES } from "./noteData";
import type { PitchNote } from "./types";

const melody: PitchNote[] = [PITCH_NOTES[39]!, PITCH_NOTES[40]!, PITCH_NOTES[41]!];

function build(overrides: Partial<Parameters<typeof getPracticeFeedbackText>[0]>) {
  return getPracticeFeedbackText({
    feedback: null,
    isRunning: false,
    mode: "reading",
    settings: defaultSettings,
    currentMelody: melody,
    activeNoteId: "C4",
    ...overrides,
  });
}

describe("getPracticeFeedbackText", () => {
  it("prompts to listen or wait when there is no feedback", () => {
    expect(build({ isRunning: true })).toBe("Listening");
    expect(build({ isRunning: false })).toBe("Ready");
  });

  it("confirms a correct answer", () => {
    expect(build({ feedback: { answer: "C", answerId: "C4", isCorrect: true } })).toBe("Correct");
  });

  it("hides the pitch answer when reveal is disabled", () => {
    expect(
      build({
        mode: "pitch",
        feedback: { answer: "C", isCorrect: false },
        settings: { ...defaultSettings, revealPitchAfterAnswer: false },
      }),
    ).toBe("Try the next one");
  });

  it("reveals a missed melody as a note sequence", () => {
    const text = build({
      mode: "pitch",
      feedback: { answer: "C", isCorrect: false },
      settings: { ...defaultSettings, revealPitchAfterAnswer: true, pitchExercise: "melody" },
    });
    expect(text).toBe(`It was ${melody.map((note) => note.id).join(" - ")}`);
  });

  it("reveals a missed single note", () => {
    expect(build({ feedback: { answer: "D", answerId: "D4", isCorrect: false }, activeNoteId: "C4" })).toBe(
      "It was C4",
    );
  });
});

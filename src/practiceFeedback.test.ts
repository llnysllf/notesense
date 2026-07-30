import { describe, expect, it } from "vitest";
import { defaultSettings } from "@notesense/shared";
import { getPracticeFeedbackText } from "./practiceFeedback";
import { getPitchNotes } from "./noteData";
import type { PracticeSettings } from "./types";

const pitchNotes = getPitchNotes();
const base = {
  isRunning: false,
  mode: "reading",
  settings: defaultSettings as PracticeSettings,
  activeNoteId: "C4",
  currentMelody: pitchNotes.slice(0, 3),
};

describe("getPracticeFeedbackText", () => {
  it("reports readiness before the first answer", () => {
    expect(getPracticeFeedbackText({ ...base, feedback: null })).toBe("Ready");
    expect(getPracticeFeedbackText({ ...base, feedback: null, isRunning: true })).toBe("Listening");
  });

  it("confirms a correct answer without repeating the note", () => {
    expect(getPracticeFeedbackText({ ...base, feedback: { answer: "C", isCorrect: true } })).toBe("Correct");
  });

  it("reveals the answer in the modes that teach", () => {
    expect(getPracticeFeedbackText({ ...base, feedback: { answer: "D", isCorrect: false } })).toBe("It was C4");
  });

  it("never reveals the answer during a test", () => {
    const settings = { ...defaultSettings, readingMode: "test" } as PracticeSettings;

    expect(getPracticeFeedbackText({ ...base, settings, feedback: { answer: "D", isCorrect: false } })).toBe(
      "Try the next one",
    );
  });

  it("respects the pitch reveal setting and names a whole sequence", () => {
    const hidden = { ...defaultSettings, revealPitchAfterAnswer: false } as PracticeSettings;
    expect(
      getPracticeFeedbackText({
        ...base,
        mode: "pitch",
        settings: hidden,
        feedback: { answer: "D", isCorrect: false },
      }),
    ).toBe("Try the next one");

    const melody = { ...defaultSettings, pitchExercise: "melody" } as PracticeSettings;
    expect(
      getPracticeFeedbackText({
        ...base,
        mode: "pitch",
        settings: melody,
        feedback: { answer: "D", isCorrect: false },
      }),
    ).toBe(`It was ${base.currentMelody.map((note) => note.id).join(" - ")}`);
  });
});

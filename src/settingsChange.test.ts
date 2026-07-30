import { describe, expect, it } from "vitest";
import { defaultSettings } from "@notesense/shared";
import { requiresSessionReset } from "./settingsChange";

describe("requiresSessionReset", () => {
  it("restarts when the material the round draws from changes", () => {
    expect(requiresSessionReset(defaultSettings, { readingRange: "bass-starter" })).toBe(true);
    expect(requiresSessionReset(defaultSettings, { pitchRange: "natural" })).toBe(true);
    expect(requiresSessionReset(defaultSettings, { pitchExercise: "melody" })).toBe(true);
    expect(requiresSessionReset(defaultSettings, { melodyLength: 5 })).toBe(true);
    expect(requiresSessionReset(defaultSettings, { customReadingRange: { startNoteId: "C2", endNoteId: "C5" } })).toBe(
      true,
    );
    expect(requiresSessionReset(defaultSettings, { customPitchRange: { startNoteId: "C2", endNoteId: "C5" } })).toBe(
      true,
    );
  });

  it("restarts when the reading mode changes, since prompts are chosen differently", () => {
    expect(requiresSessionReset(defaultSettings, { readingMode: "test" })).toBe(true);
    expect(requiresSessionReset({ ...defaultSettings, readingMode: "test" }, { readingMode: "test" })).toBe(false);
  });

  it("leaves the round alone for changes that do not affect the prompts", () => {
    expect(requiresSessionReset(defaultSettings, {})).toBe(false);
    expect(requiresSessionReset(defaultSettings, { roundLength: 90 })).toBe(false);
    expect(requiresSessionReset(defaultSettings, { autoPlayPitch: false })).toBe(false);
    expect(requiresSessionReset(defaultSettings, { revealPitchAfterAnswer: false })).toBe(false);
    expect(requiresSessionReset(defaultSettings, { adaptivePractice: false })).toBe(false);
  });

  it("ignores a patch that repeats the current value", () => {
    expect(requiresSessionReset(defaultSettings, { readingRange: defaultSettings.readingRange })).toBe(false);
    expect(requiresSessionReset(defaultSettings, { customReadingRange: defaultSettings.customReadingRange })).toBe(
      false,
    );
    expect(requiresSessionReset(defaultSettings, { customPitchRange: defaultSettings.customPitchRange })).toBe(false);
  });
});

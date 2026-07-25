import { describe, expect, it } from "vitest";
import { EXERCISE_SCHEMA_VERSION, normalizeExerciseDefinition } from "./exerciseDefinition";

const valid = () => ({
  id: "ex-1",
  kind: "reading.staff-to-key",
  title: "Read and play C4",
  competencyIds: ["reading.pitch.staff-to-key", "reading.pitch.staff-to-key", "bogus"],
  dimensions: { clef: "treble", junk: { x: 1 } },
  difficulty: 0.3,
  estimatedSeconds: 6,
  stimulus: { kind: "prompt-note", midi: 60 },
  expectedAnswer: { kind: "pitch", midi: 60 },
  inputModes: ["touch", "midi", "touch"],
  scoringPolicy: { components: ["pitch"], passThreshold: 0.8 },
  contentSource: "generated",
  seed: "s1",
});

describe("normalizeExerciseDefinition", () => {
  it("normalizes a valid definition, deduping and dropping unknown tags", () => {
    const def = normalizeExerciseDefinition(valid());
    expect(def).not.toBeNull();
    expect(def?.schemaVersion).toBe(EXERCISE_SCHEMA_VERSION);
    expect(def?.competencyIds).toEqual(["reading.pitch.staff-to-key"]);
    expect(def?.inputModes).toEqual(["touch", "midi"]);
    expect(def?.dimensions).toEqual({ clef: "treble" });
    expect(def?.seed).toBe("s1");
  });

  it("applies defaults for optional numeric and source fields", () => {
    const raw = valid();
    delete (raw as { estimatedSeconds?: unknown }).estimatedSeconds;
    delete (raw as { contentSource?: unknown }).contentSource;
    const def = normalizeExerciseDefinition(raw);
    expect(def?.version).toBe(1);
    expect(def?.generatorVersion).toBe(1);
    expect(def?.estimatedSeconds).toBe(10);
    expect(def?.contentSource).toBe("generated");
    expect(def?.license).toBeUndefined();
  });

  it("clamps difficulty and accepts every stimulus/answer variant", () => {
    expect(normalizeExerciseDefinition({ ...valid(), difficulty: 9 })?.difficulty).toBe(1);
    expect(
      normalizeExerciseDefinition({
        ...valid(),
        stimulus: { kind: "audio-pitch", midi: [60, 64, 67], playback: "block" },
        expectedAnswer: { kind: "pitch-set", midi: [60, 64, 67] },
      })?.stimulus.kind,
    ).toBe("audio-pitch");
    expect(
      normalizeExerciseDefinition({
        ...valid(),
        stimulus: { kind: "notation", scoreId: "sc-1" },
        expectedAnswer: { kind: "choice", optionId: "a" },
      })?.expectedAnswer.kind,
    ).toBe("choice");
  });

  it("rejects definitions missing required fields", () => {
    expect(normalizeExerciseDefinition(null)).toBeNull();
    expect(normalizeExerciseDefinition({ ...valid(), id: "" })).toBeNull();
    expect(normalizeExerciseDefinition({ ...valid(), kind: "" })).toBeNull();
    expect(normalizeExerciseDefinition({ ...valid(), title: "   " })).toBeNull();
    expect(normalizeExerciseDefinition({ ...valid(), competencyIds: ["bogus"] })).toBeNull();
    expect(normalizeExerciseDefinition({ ...valid(), inputModes: [] })).toBeNull();
    expect(normalizeExerciseDefinition({ ...valid(), stimulus: { kind: "prompt-note", midi: 5 } })).toBeNull();
    expect(normalizeExerciseDefinition({ ...valid(), expectedAnswer: { kind: "pitch", midi: 999 } })).toBeNull();
  });
});

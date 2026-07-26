import { describe, expect, it } from "vitest";
import { type ExerciseDefinition } from "./exerciseDefinition";
import { readingNoteGenerator } from "./generators/readingNote";
import { validateExerciseDefinition, validateExercises } from "./validation";

const base = (): ExerciseDefinition => readingNoteGenerator.generate({ seed: "base" });

const withOverrides = (over: Partial<ExerciseDefinition>): ExerciseDefinition => ({ ...base(), ...over });

describe("validateExerciseDefinition", () => {
  it("passes a well-formed generated exercise", () => {
    expect(validateExerciseDefinition(base())).toEqual([]);
  });

  it("flags each category of problem", () => {
    const problems = (def: ExerciseDefinition) => validateExerciseDefinition(def).map((issue) => issue.problem);

    expect(problems(withOverrides({ competencyIds: [] }))).toContain("no competency tags");
    expect(problems(withOverrides({ competencyIds: ["ghost" as never] }))).toContain("unknown competency ghost");
    expect(problems(withOverrides({ difficulty: 5 }))).toContain("difficulty 5 out of range");
    expect(problems(withOverrides({ estimatedSeconds: 0 }))).toContain("estimatedSeconds must be positive");
    expect(problems(withOverrides({ inputModes: [] }))).toContain("no input modes");
    expect(problems(withOverrides({ expectedAnswer: { kind: "pitch", midi: 200 } }))).toContain(
      "expected pitch out of range",
    );
    expect(
      problems(
        withOverrides({ stimulus: { kind: "prompt-note", midi: 61 }, expectedAnswer: { kind: "pitch", midi: 60 } }),
      ),
    ).toContain("prompt-note stimulus does not match the expected pitch");
    expect(
      problems(
        withOverrides({
          stimulus: { kind: "audio-pitch", midi: [60], playback: "single" },
          expectedAnswer: { kind: "pitch", midi: 62 },
        }),
      ),
    ).toContain("single audio stimulus does not match the expected pitch");
    expect(problems(withOverrides({ contentSource: "builtin" }))).toContain(
      "built-in or imported content needs a license",
    );
  });

  it("accepts a licensed built-in exercise", () => {
    expect(validateExerciseDefinition(withOverrides({ contentSource: "builtin", license: "CC0" }))).toEqual([]);
  });

  it("validates the pitch-group and audio families", () => {
    const problems = (def: ExerciseDefinition) => validateExerciseDefinition(def).map((issue) => issue.problem);

    // Block chord: stimulus and expected chord must be the same set (order-free).
    expect(
      validateExerciseDefinition(
        withOverrides({
          stimulus: { kind: "audio-pitch", midi: [60, 64, 67], playback: "block" },
          expectedAnswer: { kind: "pitch-set", midi: [67, 60, 64] },
        }),
      ),
    ).toEqual([]);
    expect(
      problems(
        withOverrides({
          stimulus: { kind: "audio-pitch", midi: [60, 64, 67], playback: "block" },
          expectedAnswer: { kind: "pitch-set", midi: [60, 64] },
        }),
      ),
    ).toContain("block audio stimulus does not match the expected chord");

    // Arpeggio: order matters.
    expect(
      validateExerciseDefinition(
        withOverrides({
          stimulus: { kind: "audio-pitch", midi: [60, 62, 64], playback: "arpeggio" },
          expectedAnswer: { kind: "pitch-sequence", midi: [60, 62, 64] },
        }),
      ),
    ).toEqual([]);
    expect(
      problems(
        withOverrides({
          stimulus: { kind: "audio-pitch", midi: [60, 62, 64], playback: "arpeggio" },
          expectedAnswer: { kind: "pitch-sequence", midi: [64, 62, 60] },
        }),
      ),
    ).toContain("arpeggio audio stimulus does not match the expected sequence");

    // Notation stimulus: no midi cross-check, so a choice answer is fine.
    expect(
      validateExerciseDefinition(
        withOverrides({
          stimulus: { kind: "notation", scoreId: "s" },
          expectedAnswer: { kind: "choice", optionId: "a" },
        }),
      ),
    ).toEqual([]);

    // Empty / out-of-range pitch groups and empty choice.
    expect(problems(withOverrides({ expectedAnswer: { kind: "pitch-set", midi: [] } }))).toContain(
      "empty expected pitch group",
    );
    expect(problems(withOverrides({ expectedAnswer: { kind: "pitch-sequence", midi: [200] } }))).toContain(
      "expected pitch group out of range",
    );
    expect(problems(withOverrides({ expectedAnswer: { kind: "choice", optionId: "" } }))).toContain(
      "empty choice option",
    );
  });
});

describe("validateExercises", () => {
  it("flags duplicate ids across a batch", () => {
    const def = base();
    const issues = validateExercises([def, def]);
    expect(issues.some((issue) => issue.problem === "duplicate exercise id")).toBe(true);
  });
});

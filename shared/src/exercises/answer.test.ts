import { describe, expect, it } from "vitest";
import { matchAnswer, normalizeUserAnswer, type AnswerMatch, type ExpectedAnswer, type UserAnswer } from "./answer";
import { TRANSPORT_V1 } from "../music/time";

const correctness = (match: AnswerMatch): boolean => {
  if (!match.gradable) throw new Error(match.reason);
  return match.correct;
};

describe("normalizeUserAnswer", () => {
  it("accepts the structured answer families", () => {
    expect(normalizeUserAnswer({ kind: "pitch", midi: 60 })).toEqual({ kind: "pitch", midi: 60 });
    expect(normalizeUserAnswer({ kind: "pitch-set", midi: [60, 64, 67] })).toEqual({
      kind: "pitch-set",
      midi: [60, 64, 67],
    });
    expect(normalizeUserAnswer({ kind: "pitch-sequence", midi: [60, 62] })).toEqual({
      kind: "pitch-sequence",
      midi: [60, 62],
    });
    expect(normalizeUserAnswer({ kind: "choice", optionId: "major-third" })).toEqual({
      kind: "choice",
      optionId: "major-third",
    });
  });

  it("rejects malformed input", () => {
    expect(normalizeUserAnswer(null)).toBeUndefined();
    expect(normalizeUserAnswer({ kind: "pitch", midi: 5 })).toBeUndefined(); // below piano
    expect(normalizeUserAnswer({ kind: "pitch-set", midi: [] })).toBeUndefined();
    expect(normalizeUserAnswer({ kind: "pitch-sequence", midi: [60, 5] })).toBeUndefined();
    expect(normalizeUserAnswer({ kind: "choice", optionId: "" })).toBeUndefined();
    expect(normalizeUserAnswer({ kind: "rhythm", onsetsSeconds: [0] })).toBeUndefined(); // runtime-only
  });
});

describe("matchAnswer", () => {
  it("grades the exact-match families", () => {
    expect(matchAnswer({ kind: "pitch", midi: 60 }, { kind: "pitch", midi: 60 })).toEqual({
      gradable: true,
      correct: true,
      mistakeCodes: [],
    });
    expect(matchAnswer({ kind: "pitch", midi: 60 }, { kind: "pitch", midi: 61 })).toEqual({
      gradable: true,
      correct: false,
      mistakeCodes: ["wrong-pitch"],
    });
    // Chords are order-insensitive.
    expect(
      correctness(matchAnswer({ kind: "pitch-set", midi: [60, 64, 67] }, { kind: "pitch-set", midi: [67, 60, 64] })),
    ).toBe(true);
    expect(correctness(matchAnswer({ kind: "pitch-set", midi: [60, 64] }, { kind: "pitch-set", midi: [60, 65] }))).toBe(
      false,
    );
    // Sequences are order-sensitive.
    expect(
      correctness(matchAnswer({ kind: "pitch-sequence", midi: [60, 62] }, { kind: "pitch-sequence", midi: [62, 60] })),
    ).toBe(false);
    expect(correctness(matchAnswer({ kind: "choice", optionId: "a" }, { kind: "choice", optionId: "a" }))).toBe(true);
    expect(correctness(matchAnswer({ kind: "choice", optionId: "a" }, { kind: "choice", optionId: "b" }))).toBe(false);
  });

  it("defers timing/voice grading and reports kind mismatches", () => {
    const rhythmExpected: ExpectedAnswer = { kind: "rhythm", onsetTicks: [0, 960], transport: TRANSPORT_V1 };
    const rhythmUser: UserAnswer = { kind: "rhythm", onsetsSeconds: [0, 0.5] };
    expect(matchAnswer(rhythmExpected, rhythmUser)).toEqual({
      gradable: false,
      reason: expect.stringContaining("runtime"),
    });
    expect(matchAnswer({ kind: "pitch", midi: 60 }, { kind: "choice", optionId: "a" })).toEqual({
      gradable: false,
      reason: expect.stringContaining("does not match"),
    });
  });
});

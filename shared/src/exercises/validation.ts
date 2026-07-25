// Content validation: semantic checks a normalizer cannot make, such as whether
// an exercise is actually answerable and whether its stimulus and expected
// answer agree. Used by tests now and by the content:check gate later.

import { isCompetencyId } from "../curriculum/competencies";
import { type ExerciseDefinition } from "./exerciseDefinition";

export type ContentIssue = { id: string; problem: string };

const inRange = (midi: number) => Number.isInteger(midi) && midi >= 21 && midi <= 108;
const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();
const sameSequence = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

export function validateExerciseDefinition(def: ExerciseDefinition): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const fail = (problem: string) => issues.push({ id: def.id, problem });

  if (def.competencyIds.length === 0) fail("no competency tags");
  for (const competencyId of def.competencyIds) {
    if (!isCompetencyId(competencyId)) fail(`unknown competency ${competencyId}`);
  }
  if (def.difficulty < 0 || def.difficulty > 1) fail(`difficulty ${def.difficulty} out of range`);
  if (def.estimatedSeconds <= 0) fail("estimatedSeconds must be positive");
  if (def.inputModes.length === 0) fail("no input modes");

  const answer = def.expectedAnswer;
  if (answer.kind === "pitch" && !inRange(answer.midi)) fail("expected pitch out of range");
  if (answer.kind === "pitch-set" || answer.kind === "pitch-sequence") {
    if (answer.midi.length === 0) fail("empty expected pitch group");
    if (!answer.midi.every(inRange)) fail("expected pitch group out of range");
  }
  if (answer.kind === "choice" && answer.optionId.length === 0) fail("empty choice option");

  const stimulus = def.stimulus;
  if (stimulus.kind === "prompt-note" && !(answer.kind === "pitch" && answer.midi === stimulus.midi)) {
    fail("prompt-note stimulus does not match the expected pitch");
  }
  if (stimulus.kind === "audio-pitch") {
    if (stimulus.playback === "single" && !(answer.kind === "pitch" && stimulus.midi[0] === answer.midi)) {
      fail("single audio stimulus does not match the expected pitch");
    }
    if (stimulus.playback === "block" && !(answer.kind === "pitch-set" && sameSet(stimulus.midi, answer.midi))) {
      fail("block audio stimulus does not match the expected chord");
    }
    if (
      stimulus.playback === "arpeggio" &&
      !(answer.kind === "pitch-sequence" && sameSequence(stimulus.midi, answer.midi))
    ) {
      fail("arpeggio audio stimulus does not match the expected sequence");
    }
  }

  if (def.contentSource !== "generated" && !def.license) fail("built-in or imported content needs a license");

  return issues;
}

// Validates a batch and flags duplicate ids across it.
export function validateExercises(defs: readonly ExerciseDefinition[]): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const seen = new Set<string>();
  for (const def of defs) {
    if (seen.has(def.id)) issues.push({ id: def.id, problem: "duplicate exercise id" });
    seen.add(def.id);
    issues.push(...validateExerciseDefinition(def));
  }
  return issues;
}

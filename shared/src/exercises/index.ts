// Exercise content platform: the versioned exercise definition, structured
// answers, scoring policy, deterministic generators, and content validation.
// Framework-free; every exercise family registers through this one shape.

export * from "./answer";
export * from "./scoringPolicy";
export * from "./exerciseDefinition";
export * from "./seededRng";
export * from "./generator";
export * from "./validation";
export { readingNoteGenerator } from "./generators/readingNote";
export { pitchNoteGenerator } from "./generators/pitchNote";
export {
  earChoiceOptions,
  EAR_CADENCE_OPTIONS,
  EAR_CHORD_OPTIONS,
  EAR_INTERVAL_OPTIONS,
  EAR_SCALE_OPTIONS,
  type EarChoiceOption,
} from "./generators/earChoice";
export { MAX_SEQUENCE_LENGTH, MIN_SEQUENCE_LENGTH } from "./generators/earPlayback";

import { createRegistry } from "./generator";
import { readingNoteGenerator } from "./generators/readingNote";
import { pitchNoteGenerator } from "./generators/pitchNote";
import {
  earCadenceGenerator,
  earChordGenerator,
  earIntervalGenerator,
  earScaleGenerator,
} from "./generators/earChoice";
import { earIntervalPlayGenerator, earKeyCentreGenerator, earSequenceGenerator } from "./generators/earPlayback";
import { earRhythmEchoGenerator, earTranscriptionGenerator } from "./generators/earTranscription";

// Every ear family, in the order a learner meets them: name what you hear, play
// it back, then write it down.
export const EAR_GENERATORS = [
  earIntervalGenerator,
  earChordGenerator,
  earScaleGenerator,
  earCadenceGenerator,
  earIntervalPlayGenerator,
  earSequenceGenerator,
  earKeyCentreGenerator,
  earRhythmEchoGenerator,
  earTranscriptionGenerator,
] as const;

export const BUILT_IN_GENERATORS = [readingNoteGenerator, pitchNoteGenerator, ...EAR_GENERATORS] as const;

export const exerciseRegistry = /* @__PURE__ */ createRegistry(BUILT_IN_GENERATORS);

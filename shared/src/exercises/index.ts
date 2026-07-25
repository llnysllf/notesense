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

import { createRegistry } from "./generator";
import { readingNoteGenerator } from "./generators/readingNote";
import { pitchNoteGenerator } from "./generators/pitchNote";

// The generators available today (reading + pitch, per the lean Slice 2 scope).
export const BUILT_IN_GENERATORS = [readingNoteGenerator, pitchNoteGenerator] as const;

export const exerciseRegistry = createRegistry(BUILT_IN_GENERATORS);

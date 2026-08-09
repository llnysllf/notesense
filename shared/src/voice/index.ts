// Singing: pure pitch detection over a frame of samples, the derived contour
// that is all the app ever keeps, scoring that refuses to grade tone quality,
// and the learner's comfortable range. Framework-free.
//
// The privacy boundary lives at the top of this module: samples go into
// `detectPitch` and a single estimate comes out. Nothing downstream of that
// point has raw audio, so nothing downstream can persist or transmit it.

export * from "./pitchDetect";
export * from "./contour";
export * from "./sungScore";
export * from "./vocalRange";
export * from "./singingExercise";

// Canonical musical domain: rational time, spelled pitch, the score model,
// timeline compilation, untrusted-input validation, and the legacy Song
// adapter. Framework-free; the persisted source of truth is rational time,
// with integer ticks derived only at compile time.

export * from "./time";
export * from "./pitch";
export * from "./score";
export * from "./validation";
export * from "./compileTimeline";
export * from "./legacySongAdapter";

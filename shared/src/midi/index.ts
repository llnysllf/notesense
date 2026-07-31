// Web MIDI as an input source: the wire format, the sustain model, latency
// calibration, and the adapter that feeds the shared runtime. Framework-free —
// device access itself lives in the app layer.

export * from "./message";
export * from "./latency";
export * from "./adapter";

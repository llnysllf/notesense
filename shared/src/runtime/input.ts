// Raw input events feeding the exercise runtime, from any source (touch,
// computer keyboard, MIDI, microphone). Timestamps are audio-clock seconds so
// grading happens in one timebase; the source-specific browser adapters convert
// their native events into these before the runtime ever sees them.

export type InputSource = "touch" | "computer-keyboard" | "midi" | "microphone";

export type InputEvent =
  | { kind: "note-on"; midi: number; atSeconds: number; velocity?: number; source: InputSource }
  | { kind: "note-off"; midi: number; atSeconds: number; source: InputSource }
  | { kind: "sustain"; down: boolean; atSeconds: number; source: InputSource }
  | { kind: "tap"; atSeconds: number; source: InputSource }
  | { kind: "choice"; optionId: string; atSeconds: number; source: InputSource };

export function isNoteOn(event: InputEvent): event is Extract<InputEvent, { kind: "note-on" }> {
  return event.kind === "note-on";
}

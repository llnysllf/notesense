// Turns the raw InputEvents captured during accepting-input into a structured
// UserAnswer, so every input source flows into the same grading path. The
// collector mode is chosen from the exercise's expected answer.

import { type UserAnswer } from "../exercises/answer";
import { isNoteOn, type InputEvent } from "./input";

export type CollectorMode = "pitch" | "pitch-set" | "pitch-sequence" | "rhythm" | "choice";

// The collector mode implied by an expected answer kind.
export function collectorModeFor(kind: UserAnswer["kind"]): CollectorMode | undefined {
  switch (kind) {
    case "pitch":
    case "pitch-set":
    case "pitch-sequence":
    case "rhythm":
    case "choice":
      return kind;
    default:
      return undefined;
  }
}

export function collectAnswer(mode: CollectorMode, events: readonly InputEvent[]): UserAnswer | undefined {
  switch (mode) {
    case "pitch": {
      const first = events.find(isNoteOn);
      return first ? { kind: "pitch", midi: first.midi } : undefined;
    }
    case "pitch-set": {
      const midi = [...new Set(events.filter(isNoteOn).map((event) => event.midi))];
      return midi.length > 0 ? { kind: "pitch-set", midi } : undefined;
    }
    case "pitch-sequence": {
      const midi = events.filter(isNoteOn).map((event) => event.midi);
      return midi.length > 0 ? { kind: "pitch-sequence", midi } : undefined;
    }
    case "rhythm": {
      const onsetsSeconds = events
        .filter((event) => event.kind === "note-on" || event.kind === "tap")
        .map((event) => event.atSeconds);
      return onsetsSeconds.length > 0 ? { kind: "rhythm", onsetsSeconds } : undefined;
    }
    case "choice": {
      const choice = events.find((event): event is Extract<InputEvent, { kind: "choice" }> => event.kind === "choice");
      return choice ? { kind: "choice", optionId: choice.optionId } : undefined;
    }
    default:
      return undefined;
  }
}

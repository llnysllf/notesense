// Turns the raw InputEvents captured during accepting-input into a structured
// UserAnswer, so every input source flows into the same grading path. The
// collector mode is chosen from the exercise's expected answer.

import { type ExpectedAnswer, type UserAnswer } from "../exercises/answer";
import { isNoteOn, type InputEvent } from "./input";

export type CollectorMode = "pitch" | "pitch-set" | "pitch-sequence" | "rhythm" | "choice";

// The collector mode implied by an expected answer kind.
export function collectorModeFor(kind: ExpectedAnswer["kind"]): CollectorMode | undefined {
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

function ordered(events: readonly InputEvent[]): InputEvent[] {
  return [...events].sort((a, b) => a.atSeconds - b.atSeconds);
}

function distinctNoteOns(events: readonly InputEvent[]): Extract<InputEvent, { kind: "note-on" }>[] {
  const seen = new Set<string>();
  return ordered(events).filter((event): event is Extract<InputEvent, { kind: "note-on" }> => {
    if (!isNoteOn(event)) return false;
    // Native adapters can occasionally replay the same note-on. Identical
    // source/midi/timestamp events are duplicates, not a second answer.
    const key = `${event.source}:${event.midi}:${event.atSeconds}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function distinctOnsets(events: readonly InputEvent[]): Array<Extract<InputEvent, { kind: "note-on" | "tap" }>> {
  const seen = new Set<string>();
  return ordered(events).filter((event): event is Extract<InputEvent, { kind: "note-on" | "tap" }> => {
    if (event.kind !== "note-on" && event.kind !== "tap") return false;
    const key = `${event.kind}:${event.source}:${event.atSeconds}:${event.kind === "note-on" ? event.midi : ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collectAnswer(mode: CollectorMode, events: readonly InputEvent[]): UserAnswer | undefined {
  switch (mode) {
    case "pitch": {
      const first = distinctNoteOns(events)[0];
      return first ? { kind: "pitch", midi: first.midi } : undefined;
    }
    case "pitch-set": {
      const midi = [...new Set(distinctNoteOns(events).map((event) => event.midi))];
      return midi.length > 0 ? { kind: "pitch-set", midi } : undefined;
    }
    case "pitch-sequence": {
      const midi = distinctNoteOns(events).map((event) => event.midi);
      return midi.length > 0 ? { kind: "pitch-sequence", midi } : undefined;
    }
    case "rhythm": {
      const onsetsSeconds = distinctOnsets(events).map((event) => event.atSeconds);
      return onsetsSeconds.length > 0 ? { kind: "rhythm", onsetsSeconds } : undefined;
    }
    case "choice": {
      const choice = ordered(events).find(
        (event): event is Extract<InputEvent, { kind: "choice" }> => event.kind === "choice",
      );
      return choice ? { kind: "choice", optionId: choice.optionId } : undefined;
    }
    default:
      return undefined;
  }
}

# ADR 0062: Add Unified Exercise Runtime Core

## Status

Accepted

## Context

Reading and pitch practice today each carry their own ad hoc flow: how a prompt is presented, when input is accepted, how raw key presses become an answer, and how that answer is graded. As rhythm, MIDI, ear, and singing arrive, repeating that per feature would fork the lifecycle and the grading path again, and would couple exercise logic to browser input types (pointer events, `MIDIMessageEvent`, microphone frames).

The Slice 1 musical domain and the Slice 2 content platform already give one representation for material and one for answers. What is missing is one _runtime_: a single session/prompt lifecycle, one clock, one raw-input model, one collector that turns input into a structured answer, and one scorer interface every family grades through.

## Decision

Add a framework-free runtime core under `shared/src/runtime/`:

- `input.ts` — the `InputEvent` union (note-on/off, sustain, tap, choice) tagged with its `InputSource`. Timestamps are audio-clock seconds, so grading stays in one timebase; source-specific browser adapters convert native events into these before the runtime sees them.
- `transport.ts` — a `RuntimeTransport` clock + scheduler interface (named to stay distinct from the musical `Transport`/PPQ), plus a deterministic manual transport for tests and headless drives.
- `promptMachine.ts` — the per-prompt lifecycle as a pure reducer: preparing → (count-in) → presenting → accepting-input ↔ paused → feedback → complete, with illegal commands ignored.
- `sessionMachine.ts` — the session over a fixed sequence of prompts as a pure reducer: idle → running → complete, with progress.
- `answerCollector.ts` — turns the `InputEvent`s captured during accepting-input into a Slice 2 `UserAnswer`, so every input source flows into the same grading path.
- `scorer.ts` — the `Scorer` interface plus a default exact-match scorer delegating to the Slice 2 answer grading. Timing, performance, and voice answers are reported as not-yet-gradable; the rhythm/MIDI/singing slices register richer scorers against the same interface.

Scope is the framework-free core only (the "contract + pure-engine" step). The browser transport and touch/keyboard input adapters, and the compatibility wrapper that routes the existing `usePracticeSession` through this runtime, are a deferred follow-up.

## Consequences

- Every current and future exercise family runs one lifecycle and one grading path instead of bespoke flows.
- Exercise logic never imports browser input types; adapters translate to `InputEvent` at the edge.
- Timing is expressed in audio-clock seconds throughout, consistent with the performed-vs-musical-time split established earlier.
- The reducers are pure and driven by a manual transport, so the runtime is exhaustively testable with a fake clock.
- Additive: no storage key, export schema, or existing behavior changes yet; the current practice flow is migrated behind an adapter in the follow-up. Changes to the runtime lifecycle or the input/scorer interfaces require architecture and testing review.

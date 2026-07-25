import { describe, expect, it } from "vitest";
import { TRANSPORT_V1 } from "../music/time";
import { collectAnswer, collectorModeFor } from "./answerCollector";
import { isNoteOn, type InputEvent } from "./input";
import { createManualTransport } from "./transport";
import { createPrompt, isPromptComplete, promptReducer } from "./promptMachine";
import { createSession, isSessionComplete, sessionProgress, sessionReducer } from "./sessionMachine";
import { exactScorer } from "./scorer";

const noteOn = (midi: number, atSeconds: number): InputEvent => ({ kind: "note-on", midi, atSeconds, source: "touch" });
const tap = (atSeconds: number): InputEvent => ({ kind: "tap", atSeconds, source: "touch" });

describe("input", () => {
  it("narrows note-on events", () => {
    expect(isNoteOn(noteOn(60, 0))).toBe(true);
    expect(isNoteOn(tap(0))).toBe(false);
  });
});

describe("manual transport", () => {
  it("fires due callbacks in time order and honours cancel + backward advance", () => {
    const transport = createManualTransport();
    expect(transport.now()).toBe(0);
    const fired: number[] = [];
    transport.schedule(2, () => fired.push(2));
    transport.schedule(1, () => fired.push(1));
    const cancel = transport.schedule(3, () => fired.push(3));
    cancel();

    transport.advanceTo(0.5);
    expect(fired).toEqual([]);
    transport.advanceTo(2);
    expect(fired).toEqual([1, 2]);
    expect(transport.now()).toBe(2);

    transport.advanceTo(1); // backward: no-op
    expect(transport.now()).toBe(2);
    transport.advanceTo(5); // the cancelled callback never fires
    expect(fired).toEqual([1, 2]);
    expect(createManualTransport(10).now()).toBe(10);
  });
});

describe("promptMachine", () => {
  it("runs the full lifecycle and ignores illegal commands", () => {
    let state = createPrompt();
    expect(state.phase).toBe("preparing");
    expect(isPromptComplete(state)).toBe(false);

    expect(promptReducer(state, "openInput")).toEqual(state); // illegal from preparing
    state = promptReducer(state, "startCountIn");
    state = promptReducer(state, "present");
    state = promptReducer(state, "openInput");
    expect(state).toEqual({ phase: "accepting-input", acceptingInput: true });
    state = promptReducer(state, "pause");
    expect(state.acceptingInput).toBe(false);
    state = promptReducer(state, "resume");
    state = promptReducer(state, "submit");
    state = promptReducer(state, "finish");
    expect(isPromptComplete(state)).toBe(true);
    expect(promptReducer(state, "present")).toEqual(state); // illegal from complete
  });

  it("supports skipping the count-in", () => {
    expect(promptReducer(createPrompt(), "present").phase).toBe("presenting");
  });
});

describe("sessionMachine", () => {
  it("clamps total and advances to completion", () => {
    expect(createSession(-3)).toEqual({ phase: "idle", index: 0, total: 0 });
    expect(createSession(3.9).total).toBe(3);

    let state = createSession(2);
    expect(sessionReducer(state, { type: "advance" })).toEqual(state); // not running
    state = sessionReducer(state, { type: "start" });
    expect(state).toEqual({ phase: "running", index: 0, total: 2 });
    expect(sessionReducer(state, { type: "start" })).toEqual(state); // already started
    state = sessionReducer(state, { type: "advance" });
    expect(sessionProgress(state)).toBe(0.5);
    state = sessionReducer(state, { type: "advance" });
    expect(isSessionComplete(state)).toBe(true);
    expect(sessionProgress(state)).toBe(1);
    expect(sessionReducer(state, { type: "finish" })).toEqual(state); // already complete
  });

  it("handles empty sessions, finishing early, and unknown commands", () => {
    expect(sessionReducer(createSession(0), { type: "start" }).phase).toBe("complete");
    expect(sessionProgress(createSession(0))).toBe(1);
    const running = sessionReducer(createSession(3), { type: "start" });
    expect(sessionReducer(running, { type: "finish" }).phase).toBe("complete");
    expect(sessionReducer(running, { type: "bogus" } as never)).toEqual(running);
  });
});

describe("answerCollector", () => {
  it("maps expected-answer kinds to a collector mode", () => {
    expect(collectorModeFor("pitch")).toBe("pitch");
    expect(collectorModeFor("choice")).toBe("choice");
    expect(collectorModeFor("performance")).toBeUndefined();
    expect(collectorModeFor("voice")).toBeUndefined();
  });

  it("collects each answer family from raw input", () => {
    expect(collectAnswer("pitch", [noteOn(60, 0), noteOn(64, 1)])).toEqual({ kind: "pitch", midi: 60 });
    expect(collectAnswer("pitch", [])).toBeUndefined();
    expect(collectAnswer("pitch-set", [noteOn(60, 0), noteOn(64, 0), noteOn(60, 0)])).toEqual({
      kind: "pitch-set",
      midi: [60, 64],
    });
    expect(collectAnswer("pitch-set", [tap(0)])).toBeUndefined();
    expect(collectAnswer("pitch-sequence", [noteOn(62, 0), noteOn(60, 1)])).toEqual({
      kind: "pitch-sequence",
      midi: [62, 60],
    });
    expect(collectAnswer("pitch-sequence", [])).toBeUndefined();
    expect(collectAnswer("rhythm", [tap(0.5), noteOn(60, 1)])).toEqual({ kind: "rhythm", onsetsSeconds: [0.5, 1] });
    expect(collectAnswer("rhythm", [])).toBeUndefined();
    expect(collectAnswer("choice", [{ kind: "choice", optionId: "maj", atSeconds: 0, source: "touch" }])).toEqual({
      kind: "choice",
      optionId: "maj",
    });
    expect(collectAnswer("choice", [noteOn(60, 0)])).toBeUndefined();
    expect(collectAnswer("bogus" as never, [])).toBeUndefined();
  });
});

describe("exactScorer", () => {
  it("grades exact-match answers and defers timing answers", () => {
    expect(exactScorer({ kind: "pitch", midi: 60 }, { kind: "pitch", midi: 60 })).toEqual({
      gradable: true,
      correct: true,
      mistakeCodes: [],
    });
    expect(exactScorer({ kind: "pitch", midi: 60 }, { kind: "pitch", midi: 61 })).toEqual({
      gradable: true,
      correct: false,
      mistakeCodes: ["wrong-pitch"],
    });
    expect(
      exactScorer({ kind: "rhythm", onsetTicks: [0], transport: TRANSPORT_V1 }, { kind: "rhythm", onsetsSeconds: [0] }),
    ).toEqual({ gradable: false, correct: false, mistakeCodes: [] });
  });
});

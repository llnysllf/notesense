// The session lifecycle over a fixed sequence of prompts, as a pure reducer.
// idle -> running (advancing through prompts) -> complete. The session owns
// which prompt is current; each prompt runs its own promptMachine.

export type SessionPhase = "idle" | "running" | "complete";

export type SessionState = { phase: SessionPhase; index: number; total: number };

export type SessionCommand = { type: "start" } | { type: "advance" } | { type: "finish" };

export function createSession(total: number): SessionState {
  return { phase: "idle", index: 0, total: Math.max(0, Math.floor(total)) };
}

export function sessionReducer(state: SessionState, command: SessionCommand): SessionState {
  switch (command.type) {
    case "start":
      if (state.phase !== "idle") return state;
      return state.total > 0 ? { ...state, phase: "running", index: 0 } : { ...state, phase: "complete" };
    case "advance": {
      if (state.phase !== "running") return state;
      const next = state.index + 1;
      return next >= state.total ? { ...state, phase: "complete" } : { ...state, index: next };
    }
    case "finish":
      return state.phase === "complete" ? state : { ...state, phase: "complete" };
    default:
      return state;
  }
}

export function isSessionComplete(state: SessionState): boolean {
  return state.phase === "complete";
}

// 0..1 progress through the session's prompts.
export function sessionProgress(state: SessionState): number {
  if (state.total === 0) return 1;
  if (state.phase === "complete") return 1;
  return state.index / state.total;
}

// The per-prompt lifecycle, as a pure reducer. One exercise item moves through
// preparing -> (count-in) -> presenting -> accepting-input <-> paused ->
// feedback -> complete. Illegal commands are ignored (state unchanged), so the
// runtime and its tests never reach an impossible phase.

export type PromptPhase =
  "idle" | "preparing" | "count-in" | "presenting" | "accepting-input" | "paused" | "feedback" | "complete";

export type PromptCommand =
  | "prepare"
  | "startCountIn"
  | "present"
  | "openInput"
  | "pause"
  | "resume"
  | "submit"
  | "finish"
  | "cancel"
  | "restart";

export type PromptState = { phase: PromptPhase; acceptingInput: boolean };

const TRANSITIONS: Record<PromptPhase, Partial<Record<PromptCommand, PromptPhase>>> = {
  idle: { prepare: "preparing" },
  preparing: { startCountIn: "count-in", present: "presenting", cancel: "idle", restart: "preparing" },
  "count-in": { present: "presenting", cancel: "idle", restart: "preparing" },
  presenting: { openInput: "accepting-input", cancel: "idle", restart: "preparing" },
  "accepting-input": { pause: "paused", submit: "feedback", cancel: "idle", restart: "preparing" },
  paused: { resume: "accepting-input", cancel: "idle", restart: "preparing" },
  feedback: { finish: "complete", restart: "preparing" },
  complete: { restart: "preparing" },
};

export const INITIAL_PROMPT: PromptState = { phase: "idle", acceptingInput: false };

export function createPrompt(): PromptState {
  return { ...INITIAL_PROMPT };
}

export function promptReducer(state: PromptState, command: PromptCommand): PromptState {
  const nextPhase = TRANSITIONS[state.phase][command];
  if (!nextPhase) return state;
  return { phase: nextPhase, acceptingInput: nextPhase === "accepting-input" };
}

// True once the prompt has been submitted and its feedback shown.
export function isPromptComplete(state: PromptState): boolean {
  return state.phase === "complete";
}

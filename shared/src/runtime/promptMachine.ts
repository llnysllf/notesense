// The per-prompt lifecycle, as a pure reducer. One exercise item moves through
// preparing -> (count-in) -> presenting -> accepting-input <-> paused ->
// feedback -> complete. Illegal commands are ignored (state unchanged), so the
// runtime and its tests never reach an impossible phase.

export type PromptPhase =
  "preparing" | "count-in" | "presenting" | "accepting-input" | "paused" | "feedback" | "complete";

export type PromptCommand = "startCountIn" | "present" | "openInput" | "pause" | "resume" | "submit" | "finish";

export type PromptState = { phase: PromptPhase; acceptingInput: boolean };

const TRANSITIONS: Record<PromptPhase, Partial<Record<PromptCommand, PromptPhase>>> = {
  preparing: { startCountIn: "count-in", present: "presenting" },
  "count-in": { present: "presenting" },
  presenting: { openInput: "accepting-input" },
  "accepting-input": { pause: "paused", submit: "feedback" },
  paused: { resume: "accepting-input" },
  feedback: { finish: "complete" },
  complete: {},
};

export const INITIAL_PROMPT: PromptState = { phase: "preparing", acceptingInput: false };

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

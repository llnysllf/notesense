// Credits a Today block when the activity it points at actually finishes.
//
// Kept apart from the plan itself so the rule stays explicit: a block is earned
// by finishing a drill or a song, never by opening one.

import { useEffect } from "react";
import type { PlanActivity, SessionSummary } from "../types";

export type PlanCompletionOptions = {
  // A fresh object per finished round, so its identity is the "a round just
  // ended" signal; its own mode says which drill it was.
  lastSummary: SessionSummary | null;
  songStatus: string;
  completeActivity: (activity: PlanActivity) => void;
};

export function usePlanCompletion({ lastSummary, songStatus, completeActivity }: PlanCompletionOptions): void {
  useEffect(() => {
    if (lastSummary) completeActivity(lastSummary.mode === "pitch" ? "pitch" : "reading");
  }, [completeActivity, lastSummary]);

  useEffect(() => {
    if (songStatus === "complete") completeActivity("songs");
  }, [completeActivity, songStatus]);
}

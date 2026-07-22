import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { emptyProgress } from "../noteData";
import { defaultSettings } from "../storage";
import { usePracticeDashboard } from "./usePracticeDashboard";

describe("usePracticeDashboard", () => {
  it("derives random pitch-range labels and empty progress summaries", () => {
    const { result } = renderHook(() =>
      usePracticeDashboard({
        mode: "pitch",
        progress: structuredClone(emptyProgress),
        settings: { ...defaultSettings, adaptivePractice: false },
        roundAttempts: 2,
        roundCorrect: 1,
      }),
    );

    expect(result.current.promptDetail).toBe("Random | Chromatic pitches C4-B4");
    expect(result.current.roundAccuracy).toBe("50%");
    expect(result.current.pitchRangeNoteIds).toContain("C#4");
  });
});

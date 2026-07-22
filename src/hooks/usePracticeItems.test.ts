import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { emptyProgress } from "../noteData";
import { defaultSettings } from "../storage";
import { usePracticeItems } from "./usePracticeItems";

describe("usePracticeItems", () => {
  it("selects each practice item without requiring a previous item", () => {
    const progress = structuredClone(emptyProgress);
    const { result } = renderHook(() => usePracticeItems({ progress, settings: defaultSettings }));

    expect(result.current.getNextReadingNote().id).toMatch(/^[A-G]\d$/);
    expect(result.current.getNextPitchNote().id).toMatch(/^[A-G]#?\d$/);
    expect(result.current.getNextPitchMelody()).toHaveLength(defaultSettings.melodyLength);
  });
});

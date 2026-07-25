import { describe, expect, it } from "vitest";
import { BUILT_IN_SONGS } from "./songLibraryData";
import { compileScore, scoreToSong, songToScore } from "./types";

// Slice 1 exit gate: every built-in song must be representable in the canonical
// score model with no behavior regression. A round-trip back to the legacy
// Song is the strongest available check that nothing about how it reads or
// plays changed.
describe("legacy song catalog in the score model", () => {
  it("has a non-trivial catalog to exercise", () => {
    expect(BUILT_IN_SONGS.length).toBeGreaterThan(100);
  });

  it("round-trips every built-in song unchanged", () => {
    for (const original of BUILT_IN_SONGS) {
      const restored = scoreToSong(songToScore(original), original.source);
      expect(restored, original.id).toEqual(original);
    }
  });

  it("compiles every built-in song to an ordered, non-empty timeline", () => {
    for (const original of BUILT_IN_SONGS) {
      const timeline = compileScore(songToScore(original));
      expect(timeline.events.length, original.id).toBeGreaterThan(0);
      const starts = timeline.events.map((event) => event.startTicks);
      expect(starts, original.id).toEqual([...starts].sort((a, b) => a - b));
    }
  });
});

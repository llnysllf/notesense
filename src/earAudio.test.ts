import { beforeEach, describe, expect, it, vi } from "vitest";
import { playPitches, playStimulus, stimulusGroups } from "./earAudio";
import { playPitchGroups } from "./audio";
import type { ExerciseStimulus } from "./types";

vi.mock("./audio", () => ({ playPitchGroups: vi.fn() }));

beforeEach(() => {
  vi.mocked(playPitchGroups).mockClear();
});

describe("stimulus grouping", () => {
  it("plays notes in turn one at a time", () => {
    const stimulus: ExerciseStimulus = { kind: "audio-pitch", midi: [60, 64, 67], playback: "arpeggio" };

    expect(stimulusGroups(stimulus)).toEqual([[60], [64], [67]]);
  });

  it("plays a chord as one group", () => {
    const stimulus: ExerciseStimulus = { kind: "audio-pitch", midi: [60, 64, 67], playback: "block" };

    expect(stimulusGroups(stimulus)).toEqual([[60, 64, 67]]);
  });

  it("splits a cadence into its chords rather than one pile of notes", () => {
    const stimulus: ExerciseStimulus = {
      kind: "audio-pitch",
      midi: [67, 71, 74, 60, 64, 67],
      playback: "block",
      groupSize: 3,
    };

    expect(stimulusGroups(stimulus)).toEqual([
      [67, 71, 74],
      [60, 64, 67],
    ]);
  });

  it("has nothing to play for a stimulus that is not audio", () => {
    expect(stimulusGroups({ kind: "notation", scoreId: "s" })).toEqual([]);
  });
});

describe("playing a stimulus", () => {
  it("turns pitches into frequencies and plays them", () => {
    playStimulus({ kind: "audio-pitch", midi: [60, 64], playback: "arpeggio" });

    expect(playPitchGroups).toHaveBeenCalledTimes(1);
    const [groups, gap] = vi.mocked(playPitchGroups).mock.calls[0] as [number[][], number];
    expect(groups).toHaveLength(2);
    expect(groups[0]?.[0]).toBeCloseTo(261.63, 1);
    // Notes in turn need a gap you can hear the distance across.
    expect(gap).toBeLessThan(1);
  });

  it("holds a chord longer than a single step", () => {
    playStimulus({ kind: "audio-pitch", midi: [60, 64, 67], playback: "block" });
    const [, blockGap] = vi.mocked(playPitchGroups).mock.calls[0] as [number[][], number];

    vi.mocked(playPitchGroups).mockClear();
    playStimulus({ kind: "audio-pitch", midi: [60, 64, 67], playback: "arpeggio" });
    const [, arpeggioGap] = vi.mocked(playPitchGroups).mock.calls[0] as [number[][], number];

    expect(blockGap).toBeGreaterThan(arpeggioGap);
  });

  it("stays silent for a stimulus with no audio", () => {
    playStimulus({ kind: "prompt-note", midi: 60 });

    expect(playPitchGroups).not.toHaveBeenCalled();
  });

  it("plays the learner's own answer back one note at a time", () => {
    playPitches([60, 62]);

    const [groups] = vi.mocked(playPitchGroups).mock.calls[0] as [number[][], number];
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(1);
  });

  it("drops a pitch it cannot sound rather than playing a wrong one", () => {
    playStimulus({ kind: "audio-pitch", midi: [60, 9999], playback: "arpeggio" });

    const [groups] = vi.mocked(playPitchGroups).mock.calls[0] as [number[][], number];
    expect(groups[1]).toEqual([]);
  });
});

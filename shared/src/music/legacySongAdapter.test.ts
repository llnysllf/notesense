import { describe, expect, it } from "vitest";
import type { Song } from "../songData";
import { scoreToSong, songToScore } from "./legacySongAdapter";
import type { Score } from "./score";

const song = (over: Partial<Song>): Song => ({
  id: "t",
  title: "Test",
  source: "builtin",
  clef: "treble",
  timeSignature: { beatsPerMeasure: 4, beatUnit: "quarter" },
  events: [],
  ...over,
});

const trebleScale = song({
  events: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"].map((noteId) => ({
    noteIds: [noteId],
    duration: "quarter",
  })),
});

const bassWaltz = song({
  clef: "bass",
  timeSignature: { beatsPerMeasure: 3, beatUnit: "quarter" },
  events: ["C3", "E3", "G3", "C4", "E4", "G4"].map((noteId) => ({ noteIds: [noteId], duration: "quarter" })),
});

const chords = song({
  events: [
    { noteIds: ["C4", "E4", "G4"], duration: "half" },
    { noteIds: ["D4", "F4", "A4"], duration: "half" },
    { noteIds: ["E4", "G4", "B4"], duration: "whole" },
  ],
});

const withRests = song({
  events: [
    { noteIds: ["C4"], duration: "quarter" },
    { noteIds: [], duration: "quarter", isRest: true },
    { noteIds: ["E4"], duration: "quarter" },
    { noteIds: [], duration: "quarter", isRest: true },
    { noteIds: ["G4"], duration: "whole" },
  ],
});

const compound = song({
  timeSignature: { beatsPerMeasure: 6, beatUnit: "eighth" },
  events: ["C4", "D4", "E4", "F4", "G4", "A4"].map((noteId) => ({ noteIds: [noteId], duration: "eighth" })),
});

describe("songToScore", () => {
  it("produces a single-part, single-voice score with the right clef and meter", () => {
    const score = songToScore(trebleScale);
    expect(score.parts).toHaveLength(1);
    expect(score.parts[0]?.clefs).toEqual([{ measure: 1, sign: "G", line: 2 }]);
    expect(score.parts[0]?.measures[0]?.meter).toEqual({ beats: 4, beatUnit: 4 });
  });

  it("groups events into measures at the same barlines the sheet draws", () => {
    const score = songToScore(trebleScale); // 8 quarters in 4/4 -> 2 measures
    expect(score.parts[0]?.measures).toHaveLength(2);
    expect(score.parts[0]?.measures[0]?.voices[0]?.events).toHaveLength(4);
    expect(score.parts[0]?.measures[1]?.number).toBe(2);
    // The meter is stated once, on the first measure.
    expect(score.parts[0]?.measures[1]?.meter).toBeUndefined();
  });

  it("emits bass clef for low songs", () => {
    expect(songToScore(bassWaltz).parts[0]?.clefs[0]).toEqual({ measure: 1, sign: "F", line: 4 });
  });
});

describe("round-trip fidelity", () => {
  it.each([
    ["treble scale", trebleScale],
    ["bass waltz", bassWaltz],
    ["chords", chords],
    ["rests", withRests],
    ["compound meter", compound],
  ])("%s survives songToScore -> scoreToSong unchanged", (_label, original) => {
    expect(scoreToSong(songToScore(original), original.source)).toEqual(original);
  });
});

describe("scoreToSong limits", () => {
  it("rejects scores that would lose parts, voices, timing, or pickup semantics", () => {
    const score = songToScore(trebleScale);
    const part = score.parts[0]!;
    expect(scoreToSong({ ...score, parts: [part, part] })).toBeUndefined();

    const multiVoice = songToScore(trebleScale);
    const measure = multiVoice.parts[0]!.measures[0]!;
    multiVoice.parts[0]!.measures[0] = { ...measure, voices: [measure.voices[0]!, measure.voices[0]!] };
    expect(scoreToSong(multiVoice)).toBeUndefined();

    const pickup = songToScore(trebleScale);
    pickup.parts[0]!.measures[0]!.pickupDuration = { num: 1, den: 1 };
    expect(scoreToSong(pickup)).toBeUndefined();

    const offset = songToScore(trebleScale);
    offset.parts[0]!.measures[0]!.voices[0]!.events[0]!.offset = { num: 1, den: 1 };
    expect(scoreToSong(offset)).toBeUndefined();

    const meterChange = songToScore(trebleScale);
    meterChange.parts[0]!.measures[1]!.meter = { beats: 3, beatUnit: 4 };
    expect(scoreToSong(meterChange)).toBeUndefined();
  });

  it("returns undefined for a score using a non-legacy duration", () => {
    const sixteenthScore: Score = {
      id: "x",
      version: 1,
      title: "X",
      parts: [
        {
          id: "p1",
          name: "p1",
          clefs: [{ measure: 1, sign: "G", line: 2 }],
          measures: [
            {
              id: "m1",
              number: 1,
              meter: { beats: 4, beatUnit: 4 },
              voices: [
                {
                  id: "v1",
                  events: [
                    {
                      kind: "note",
                      id: "n",
                      offset: { num: 0, den: 1 },
                      duration: { num: 1, den: 4 },
                      pitches: [{ step: "C", alter: 0, octave: 4 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(scoreToSong(sixteenthScore)).toBeUndefined();
  });

  it("returns undefined for an empty or partless score", () => {
    expect(scoreToSong({ id: "e", version: 1, title: "E", parts: [] })).toBeUndefined();
  });

  it("returns undefined when a meter's beat unit has no legacy note value", () => {
    const sixteenthMeter: Score = {
      id: "sm",
      version: 1,
      title: "SM",
      parts: [
        {
          id: "p1",
          name: "p1",
          clefs: [],
          measures: [
            {
              id: "m1",
              number: 1,
              meter: { beats: 3, beatUnit: 16 },
              voices: [
                {
                  id: "v1",
                  events: [
                    {
                      kind: "note",
                      id: "n",
                      offset: { num: 0, den: 1 },
                      duration: { num: 1, den: 1 },
                      pitches: [{ step: "C", alter: 0, octave: 4 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(scoreToSong(sixteenthMeter)).toBeUndefined();
  });
});

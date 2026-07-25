import { describe, expect, it } from "vitest";
import { compileScore, ticksToSeconds, timelineDurationBeats } from "./compileTimeline";
import type { Score } from "./score";

// Two 4/4 measures on one part; measure 2 inherits the meter from measure 1.
const twoMeasureScore = (): Score => ({
  id: "s",
  version: 1,
  title: "Two measures",
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
                  id: "n0",
                  offset: { num: 0, den: 1 },
                  duration: { num: 1, den: 1 },
                  pitches: [{ step: "C", alter: 0, octave: 4 }],
                },
                { kind: "rest", id: "r0", offset: { num: 1, den: 1 }, duration: { num: 1, den: 1 } },
                {
                  kind: "note",
                  id: "n1",
                  offset: { num: 2, den: 1 },
                  duration: { num: 2, den: 1 },
                  pitches: [{ step: "E", alter: 0, octave: 4 }],
                },
              ],
            },
          ],
        },
        {
          id: "m2",
          number: 2,
          voices: [
            {
              id: "v1",
              events: [
                {
                  kind: "note",
                  id: "n2",
                  offset: { num: 0, den: 1 },
                  duration: { num: 4, den: 1 },
                  pitches: [{ step: "G", alter: 0, octave: 4 }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

describe("compileScore", () => {
  it("compiles expected onsets in ticks and accumulates measure starts", () => {
    const timeline = compileScore(twoMeasureScore());
    expect(timeline.transport.ppq).toBe(960);
    expect(timeline.events.map((event) => event.startTicks)).toEqual([0, 960, 1920, 3840]);
    // Measure 2's note starts one full 4/4 measure (4 quarters = 3840 ticks) in.
    expect(timeline.events[3]?.startTicks).toBe(3840);
    expect(timeline.totalTicks).toBe(3840 + 3840);
  });

  it("marks rests with no sounding pitch and notes with their midi", () => {
    const timeline = compileScore(twoMeasureScore());
    const rest = timeline.events.find((event) => event.isRest);
    expect(rest?.midi).toEqual([]);
    expect(timeline.events[0]?.midi).toEqual([60]);
  });

  it("starts an explicit pickup at tick zero without leading silence", () => {
    const pickup: Score = {
      id: "pickup",
      version: 1,
      title: "Pickup",
      parts: [
        {
          id: "p1",
          name: "p1",
          clefs: [],
          measures: [
            {
              id: "m1",
              number: 1,
              meter: { beats: 4, beatUnit: 4 },
              pickupDuration: { num: 1, den: 1 },
              voices: [
                {
                  id: "v1",
                  events: [
                    {
                      kind: "note",
                      id: "a",
                      offset: { num: 0, den: 1 },
                      duration: { num: 1, den: 1 },
                      pitches: [{ step: "C", alter: 0, octave: 4 }],
                    },
                  ],
                },
              ],
            },
            {
              id: "m2",
              number: 2,
              voices: [
                {
                  id: "v1",
                  events: [
                    {
                      kind: "note",
                      id: "b",
                      offset: { num: 0, den: 1 },
                      duration: { num: 1, den: 1 },
                      pitches: [{ step: "D", alter: 0, octave: 4 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const timeline = compileScore(pickup);
    expect(timeline.events.map((event) => event.startTicks)).toEqual([0, 960]);
  });

  it("skips events and measure lengths not representable at the chosen transport", () => {
    const score: Score = {
      id: "odd",
      version: 1,
      title: "Odd",
      parts: [
        {
          id: "p1",
          name: "p1",
          clefs: [],
          measures: [
            {
              id: "m1",
              number: 1,
              meter: { beats: 1, beatUnit: 16 },
              voices: [
                {
                  id: "v1",
                  events: [
                    {
                      kind: "note",
                      id: "ok",
                      offset: { num: 0, den: 1 },
                      duration: { num: 1, den: 1 },
                      pitches: [{ step: "C", alter: 0, octave: 4 }],
                    },
                    {
                      kind: "note",
                      id: "bad",
                      offset: { num: 1, den: 4 },
                      duration: { num: 1, den: 4 },
                      pitches: [{ step: "D", alter: 0, octave: 4 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    // ppq 10 cannot represent a sixteenth (2.5 ticks) or the 1/16 measure length.
    const timeline = compileScore(score, { version: 9, ppq: 10 });
    expect(timeline.events.map((event) => event.sourceId)).toEqual(["ok"]);
  });
});

describe("ticksToSeconds / timelineDurationBeats", () => {
  it("projects ticks onto audio-clock seconds at a tempo", () => {
    expect(ticksToSeconds(960, 120)).toBe(0.5);
    expect(ticksToSeconds(1920, 60)).toBe(2);
  });

  it("reports the authored length in quarter-note beats", () => {
    expect(timelineDurationBeats(compileScore(twoMeasureScore()))).toBe(8);
  });
});

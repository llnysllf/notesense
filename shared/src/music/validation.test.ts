import { describe, expect, it } from "vitest";
import {
  MAX_EVENTS_PER_VOICE,
  MAX_PITCHES_PER_NOTE,
  MAX_SCORE_PARTS,
  normalizeMeter,
  normalizeScore,
} from "./validation";

const note = (step: string, octave: number, offset = 0, duration = 1) => ({
  kind: "note",
  offset: { num: offset, den: 1 },
  duration: { num: duration, den: 1 },
  pitches: [{ step, alter: 0, octave }],
});

const defaultEvents = () => [
  note("C", 4),
  note("D", 4, 1),
  { kind: "rest", offset: { num: 2, den: 1 }, duration: { num: 2, den: 1 } },
];

type Overrides = { events?: unknown[]; clefs?: unknown[]; meter?: unknown; keySignature?: unknown };

// Builds a fresh, well-formed raw score literal, overriding individual pieces
// per test. Fresh literals (rather than deep mutation) keep the untrusted-input
// shapes readable and satisfy noUncheckedIndexedAccess.
const scoreWith = ({ events, clefs, meter, keySignature }: Overrides = {}) => ({
  id: "demo",
  title: "Demo",
  parts: [
    {
      id: "p1",
      name: "Right hand",
      clefs: clefs ?? [{ measure: 1, sign: "G", line: 2 }],
      measures: [
        {
          id: "m1",
          number: 1,
          meter: meter ?? { beats: 4, beatUnit: 4 },
          keySignature: keySignature ?? { fifths: 0, mode: "major" },
          voices: [{ id: "v1", events: events ?? defaultEvents() }],
        },
      ],
    },
  ],
});

describe("normalizeScore", () => {
  it("accepts a well-formed score and preserves its structure", () => {
    const score = normalizeScore(scoreWith());
    expect(score).toBeDefined();
    expect(score?.version).toBe(1);
    expect(score?.parts[0]?.measures[0]?.voices[0]?.events).toHaveLength(3);
    expect(score?.parts[0]?.measures[0]?.meter).toEqual({ beats: 4, beatUnit: 4 });
    expect(score?.parts[0]?.measures[0]?.keySignature).toEqual({ fifths: 0, mode: "major" });
    // Every event is given a stable id.
    expect(score?.parts[0]?.measures[0]?.voices[0]?.events[0]?.id).toBe("v1-e0");
  });

  it("derives an id from the title when none is given", () => {
    const raw = scoreWith();
    delete (raw as { id?: unknown }).id;
    expect(normalizeScore(raw)?.id).toBe("score-demo");
  });

  it("rejects non-objects, missing titles, and missing parts", () => {
    expect(normalizeScore(null)).toBeUndefined();
    expect(normalizeScore("x")).toBeUndefined();
    expect(normalizeScore({ parts: [] })).toBeUndefined();
    expect(normalizeScore({ title: "  ", parts: [] })).toBeUndefined();
    expect(normalizeScore({ title: "T", parts: "nope" })).toBeUndefined();
  });

  it("drops parts, measures, and voices that end up empty", () => {
    expect(normalizeScore({ title: "T", parts: [{ measures: [] }] })).toBeUndefined();
    expect(normalizeScore({ title: "T", parts: [{ measures: [{ voices: [] }] }] })).toBeUndefined();
    expect(normalizeScore({ title: "T", parts: [{ measures: [{ voices: [{ events: [] }] }] }] })).toBeUndefined();
  });

  it("drops invalid events but keeps valid siblings", () => {
    const pitch = { step: "C", alter: 0, octave: 4 };
    const score = normalizeScore(
      scoreWith({
        events: [
          note("C", 4),
          { kind: "note", offset: { num: 1, den: 1 }, duration: { num: 1, den: 1 }, pitches: [] }, // no valid pitch
          { kind: "note", offset: { num: 1, den: 0 }, duration: { num: 1, den: 1 }, pitches: [pitch] }, // bad offset
          { kind: "note", offset: { num: 1, den: 1 }, duration: { num: 0, den: 1 }, pitches: [pitch] }, // non-positive duration
          note("E", 4, 2),
        ],
      }),
    );
    expect(score?.parts[0]?.measures[0]?.voices[0]?.events).toHaveLength(2);
  });

  it("drops pitches outside the piano range and preserves ties", () => {
    const score = normalizeScore(
      scoreWith({
        events: [
          {
            kind: "note",
            offset: { num: 0, den: 1 },
            duration: { num: 1, den: 1 },
            pitches: [
              { step: "C", alter: 0, octave: 4 },
              { step: "C", alter: 0, octave: 12 },
            ],
            tie: "start",
          },
        ],
      }),
    );
    const event = score?.parts[0]?.measures[0]?.voices[0]?.events[0];
    expect(event?.kind === "note" && event.pitches).toHaveLength(1);
    expect(event?.kind === "note" && event.tie).toBe("start");
  });

  it("ignores a note kind that is neither note nor rest", () => {
    const score = normalizeScore(
      scoreWith({ events: [{ kind: "trill", offset: { num: 0, den: 1 }, duration: { num: 1, den: 1 } }] }),
    );
    expect(score).toBeUndefined();
  });

  it("caps parts, events, and pitches", () => {
    const onePart = scoreWith().parts[0];
    const manyParts = { id: "demo", title: "Demo", parts: Array.from({ length: MAX_SCORE_PARTS + 2 }, () => onePart) };
    expect(normalizeScore(manyParts)?.parts).toHaveLength(MAX_SCORE_PARTS);

    const manyEvents = Array.from({ length: MAX_EVENTS_PER_VOICE + 5 }, () => note("C", 4));
    expect(manyEvents.length).toBeGreaterThan(MAX_EVENTS_PER_VOICE);
    expect(normalizeScore(scoreWith({ events: manyEvents }))?.parts[0]?.measures[0]?.voices[0]?.events).toHaveLength(
      MAX_EVENTS_PER_VOICE,
    );

    const bigChord = {
      kind: "note",
      offset: { num: 0, den: 1 },
      duration: { num: 1, den: 1 },
      pitches: Array.from({ length: MAX_PITCHES_PER_NOTE + 3 }, (_, i) => ({
        step: "C",
        alter: 0,
        octave: 3 + (i % 4),
      })),
    };
    const event = normalizeScore(scoreWith({ events: [bigChord] }))?.parts[0]?.measures[0]?.voices[0]?.events[0];
    expect(event?.kind === "note" && event.pitches).toHaveLength(MAX_PITCHES_PER_NOTE);
  });

  it("uses defaults for missing ids, numbers, names, and drops bad clefs/meter/key", () => {
    const raw = {
      title: "Minimal",
      parts: [
        {
          clefs: [{ measure: 0, sign: "G", line: 2 }], // bad measure -> dropped
          measures: [{ voices: [{ events: [note("C", 4)] }] }],
        },
      ],
    };
    const score = normalizeScore(raw);
    expect(score?.parts[0]?.id).toBe("p1");
    expect(score?.parts[0]?.name).toBe("p1");
    expect(score?.parts[0]?.clefs).toHaveLength(0);
    expect(score?.parts[0]?.measures[0]?.number).toBe(1);
    expect(score?.parts[0]?.measures[0]?.meter).toBeUndefined();
    expect(score?.parts[0]?.measures[0]?.keySignature).toBeUndefined();
  });
});

describe("edge branches", () => {
  it("keeps a key signature without a mode and drops out-of-range fifths", () => {
    expect(normalizeScore(scoreWith({ keySignature: { fifths: 3 } }))?.parts[0]?.measures[0]?.keySignature).toEqual({
      fifths: 3,
    });
    expect(
      normalizeScore(scoreWith({ keySignature: { fifths: 9, mode: "major" } }))?.parts[0]?.measures[0]?.keySignature,
    ).toBeUndefined();
  });

  it("drops a clef with an invalid sign and a negative event offset", () => {
    expect(normalizeScore(scoreWith({ clefs: [{ measure: 1, sign: "C", line: 3 }] }))?.parts[0]?.clefs).toHaveLength(0);

    const score = normalizeScore(
      scoreWith({
        events: [
          {
            kind: "note",
            offset: { num: -1, den: 1 },
            duration: { num: 1, den: 1 },
            pitches: [{ step: "C", alter: 0, octave: 4 }],
          },
          note("D", 4, 1),
        ],
      }),
    );
    expect(score?.parts[0]?.measures[0]?.voices[0]?.events).toHaveLength(1);
  });
});

describe("normalizeMeter", () => {
  it("accepts valid meters and rejects malformed ones", () => {
    expect(normalizeMeter({ beats: 4, beatUnit: 4 })).toEqual({ beats: 4, beatUnit: 4 });
    expect(normalizeMeter({ beats: 6, beatUnit: 8 })).toEqual({ beats: 6, beatUnit: 8 });
    expect(normalizeMeter({ beats: 0, beatUnit: 4 })).toBeUndefined();
    expect(normalizeMeter({ beats: 4, beatUnit: 3 })).toBeUndefined();
    expect(normalizeMeter({ beats: 4.5, beatUnit: 4 })).toBeUndefined();
    expect(normalizeMeter(null)).toBeUndefined();
  });
});

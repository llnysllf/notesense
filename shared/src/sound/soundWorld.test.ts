import { describe, expect, it } from "vitest";
import {
  coversRange,
  defaultSoundWorld,
  soundWorldById,
  validateBuiltInSoundWorlds,
  BUILT_IN_SOUND_WORLDS,
  DEFAULT_SOUND_WORLD_ID,
} from "./registry";
import { describeSoundWorld, normalizeSoundWorld, validateSoundWorld, type SoundWorld } from "./soundWorld";

function synthWorld(overrides: Partial<SoundWorld> = {}): SoundWorld {
  return {
    id: "test",
    label: "Test",
    description: "",
    kind: "synth",
    version: 1,
    license: "public-domain",
    attribution: "NoteSense",
    approxBytes: 0,
    voice: { wave: "sine", attackSeconds: 0.02, decayShare: 0.9, peakGain: 0.2, partials: [] },
    lowMidi: 21,
    highMidi: 108,
    ...overrides,
  };
}

// Building a world *without* a key, rather than with the key set to undefined:
// the contract distinguishes the two, and so must the tests.
function without(world: SoundWorld, key: keyof SoundWorld): SoundWorld {
  const copy = { ...world };
  delete copy[key];
  return copy as SoundWorld;
}

function sampledWorld(overrides: Partial<SoundWorld> = {}): SoundWorld {
  return {
    ...without(synthWorld(), "voice"),
    id: "pack",
    kind: "sampled",
    license: "CC0-1.0",
    approxBytes: 2_000_000,
    assetPath: "/sounds/pack.json",
    ...overrides,
  };
}

const problems = (world: SoundWorld) => validateSoundWorld(world).map((issue) => issue.problem);

describe("the shipped sound worlds", () => {
  it("all pass their own manifest rules", () => {
    expect(validateBuiltInSoundWorlds()).toEqual([]);
  });

  it("keeps the zero-download synth as the default", () => {
    // The exit gate: core practice works with nothing downloaded.
    expect(defaultSoundWorld().id).toBe(DEFAULT_SOUND_WORLD_ID);
    expect(defaultSoundWorld().approxBytes).toBe(0);
    expect(BUILT_IN_SOUND_WORLDS.every((world) => world.kind === "synth")).toBe(true);
    expect(BUILT_IN_SOUND_WORLDS.every((world) => world.approxBytes === 0)).toBe(true);
  });

  it("offers voices that are actually distinguishable", () => {
    const voices = BUILT_IN_SOUND_WORLDS.map((world) => JSON.stringify(world.voice));

    // Four identically-shaped voices with different names would be a lie.
    expect(new Set(voices).size).toBe(BUILT_IN_SOUND_WORLDS.length);
    expect(BUILT_IN_SOUND_WORLDS.length).toBeGreaterThanOrEqual(3);
  });

  it("records attribution and a licence for every world", () => {
    for (const world of BUILT_IN_SOUND_WORLDS) {
      expect(world.attribution.length).toBeGreaterThan(0);
      expect(describeSoundWorld(world)).toContain(world.license);
      expect(describeSoundWorld(world)).toContain("no download");
    }
  });

  it("falls back to the default rather than returning nothing for an unknown id", () => {
    expect(soundWorldById("no-such-world").id).toBe(DEFAULT_SOUND_WORLD_ID);
    expect(soundWorldById("warm").id).toBe("warm");
  });

  it("catches a registry that has drifted", () => {
    // The rules have to hold for a *candidate* list, not only for the array
    // that ships today, or adding a world is checked by nobody.
    const duplicated = [synthWorld({ id: DEFAULT_SOUND_WORLD_ID }), synthWorld({ id: DEFAULT_SOUND_WORLD_ID })];
    expect(validateBuiltInSoundWorlds(duplicated).map((issue) => issue.problem)).toContain("duplicate sound world id");

    const wrongDefault = [synthWorld({ id: "warm" }), synthWorld({ id: DEFAULT_SOUND_WORLD_ID })];
    expect(validateBuiltInSoundWorlds(wrongDefault).map((issue) => issue.problem)).toContain(
      "the zero-download synth must be first, and the default",
    );
  });

  it("looks an id up in whatever list it is given", () => {
    const only = [synthWorld({ id: "solo" })];

    expect(soundWorldById("solo", only).id).toBe("solo");
    expect(soundWorldById("missing", only).id).toBe("solo");
  });

  it("knows whether a world covers the range being practised", () => {
    expect(coversRange(synthWorld(), 40, 90)).toBe(true);
    expect(coversRange(synthWorld({ lowMidi: 55, highMidi: 79 }), 40, 90)).toBe(false);
  });
});

describe("manifest validation", () => {
  it("accepts a well-formed synth world", () => {
    expect(validateSoundWorld(synthWorld())).toEqual([]);
  });

  it("accepts a well-formed sampled world", () => {
    expect(validateSoundWorld(sampledWorld())).toEqual([]);
  });

  it("fails on an unknown licence rather than assuming it is fine", () => {
    // The whole point: guessing here is how unlicensed audio gets shipped.
    expect(problems(synthWorld({ license: "WTFPL" as never }))).toContain("licence WTFPL is not on the allowed list");
  });

  it("refuses a copyleft licence the project does not ship", () => {
    expect(problems(sampledWorld({ license: "GPL-3.0" as never })).join(" ")).toMatch(/not on the allowed list/);
  });

  it("requires attribution", () => {
    expect(problems(synthWorld({ attribution: "  " }))).toContain("missing attribution");
  });

  it("refuses a sampled world that points at another origin", () => {
    expect(problems(sampledWorld({ assetPath: "https://cdn.example.com/pack.json" })).join(" ")).toMatch(/same-origin/);
    expect(problems(sampledWorld({ assetPath: "//cdn.example.com/pack.json" })).join(" ")).toMatch(
      /same-origin|another origin/,
    );
  });

  it("refuses a sampled world with no size or no asset", () => {
    expect(problems(sampledWorld({ approxBytes: 0 }))).toContain("a sampled world must declare its size");
    expect(problems(without(sampledWorld(), "assetPath"))).toContain("a sampled world needs an asset path");
  });

  it("refuses a synth world that claims a download or an asset", () => {
    expect(problems(synthWorld({ approxBytes: 1024 })).join(" ")).toMatch(/zero bytes/);
    expect(problems(synthWorld({ assetPath: "/sounds/x.json" })).join(" ")).toMatch(/must not point at an asset/);
  });

  it("refuses a synth world with no voice", () => {
    expect(problems(without(synthWorld(), "voice"))).toContain("a synth world needs a voice");
  });

  it("refuses an empty checked range", () => {
    expect(problems(synthWorld({ lowMidi: 60, highMidi: 60 }))).toContain("checked range is empty");
  });
});

describe("reading an untrusted manifest", () => {
  it("reads a valid entry", () => {
    const world = normalizeSoundWorld(synthWorld({ id: "warm", label: "Warm" }));

    expect(world?.id).toBe("warm");
    expect(world?.voice?.wave).toBe("sine");
  });

  it("discards an entry with no licence rather than defaulting one", () => {
    expect(normalizeSoundWorld({ id: "x", label: "X", kind: "synth" })).toBeUndefined();
  });

  it("discards an entry that fails validation after normalizing", () => {
    // Normalizing must not launder an invalid world into an acceptable one.
    expect(normalizeSoundWorld(sampledWorld({ assetPath: "https://cdn.example.com/p.json" }))).toBeUndefined();
  });

  it("discards anything that is not an object", () => {
    expect(normalizeSoundWorld("warm")).toBeUndefined();
    expect(normalizeSoundWorld(null)).toBeUndefined();
    expect(normalizeSoundWorld([])).toBeUndefined();
  });

  it("clamps hostile numbers instead of trusting them", () => {
    const world = normalizeSoundWorld(
      synthWorld({
        voice: { wave: "sine", attackSeconds: 99, decayShare: 50, peakGain: 900, partials: [5, 0.2, -1] },
      }),
    );

    expect(world?.voice?.attackSeconds).toBe(0.02);
    expect(world?.voice?.peakGain).toBe(0.22);
    // Out-of-range partials are dropped, not clamped into something audible.
    expect(world?.voice?.partials).toEqual([0.2]);
  });

  it("refuses a voice with a waveform it cannot make", () => {
    expect(normalizeSoundWorld(synthWorld({ voice: { wave: "kazoo" } as never }))).toBeUndefined();
  });
});

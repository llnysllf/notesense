import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveSoundWorld, renderNote, resolveSoundWorld, setActiveSoundWorld } from "./soundWorlds";
import { defaultSoundWorld, soundWorldById, type SoundWorld } from "../types";

type Recorded = {
  oscillators: { type: string; frequency: number[]; started: number[]; stopped: number[] }[];
  gains: { levels: number[]; peaks: number[] }[];
};

function fakeContext(sampleRate = 48_000): { context: AudioContext; recorded: Recorded } {
  const recorded: Recorded = { oscillators: [], gains: [] };

  const context = {
    currentTime: 0,
    sampleRate,
    destination: {},
    createOscillator: () => {
      const entry = { type: "sine", frequency: [] as number[], started: [] as number[], stopped: [] as number[] };
      recorded.oscillators.push(entry);
      return {
        set type(value: string) {
          entry.type = value;
        },
        frequency: { setValueAtTime: (hz: number) => entry.frequency.push(hz) },
        connect: () => {},
        start: (at: number) => entry.started.push(at),
        stop: (at: number) => entry.stopped.push(at),
      };
    },
    createGain: () => {
      const entry = { levels: [] as number[], peaks: [] as number[] };
      recorded.gains.push(entry);
      return {
        gain: {
          setValueAtTime: (value: number) => entry.levels.push(value),
          linearRampToValueAtTime: (value: number) => entry.peaks.push(value),
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
      };
    },
  };

  return { context: context as unknown as AudioContext, recorded };
}

// A world missing a key, rather than carrying it as undefined — the contract
// treats those differently.
function without(world: SoundWorld, key: keyof SoundWorld): SoundWorld {
  const copy = { ...world };
  delete copy[key];
  return copy as SoundWorld;
}

beforeEach(() => {
  setActiveSoundWorld(defaultSoundWorld().id);
});

describe("choosing a sound world", () => {
  it("changes what a note is rendered with", () => {
    setActiveSoundWorld("reed");
    const { context, recorded } = fakeContext();

    renderNote(context, 440, 0, 1);

    expect(getActiveSoundWorld().id).toBe("reed");
    expect(recorded.oscillators[0]?.type).toBe("sawtooth");
    // Reed carries three partials above the fundamental, so it is audibly a
    // different voice rather than a differently-named one.
    expect(recorded.oscillators).toHaveLength(4);
  });

  it("falls back to the default for an id that no longer ships", () => {
    // A stale setting, or an imported file from a newer build, must not leave
    // practice silent.
    const resolved = setActiveSoundWorld("gamelan-2029");

    expect(resolved.world.id).toBe(defaultSoundWorld().id);
    expect(getActiveSoundWorld().id).toBe(defaultSoundWorld().id);
  });
});

describe("what can actually be heard", () => {
  it("accepts a synth world with a voice", () => {
    expect(resolveSoundWorld(soundWorldById("warm"))).toEqual({ world: soundWorldById("warm"), fellBack: false });
  });

  it("falls back rather than going silent when a world needs an asset", () => {
    // No sampled pack ships, so choosing one must degrade to the built-in tone
    // and say so instead of playing nothing.
    const sampled = { ...soundWorldById("warm"), kind: "sampled", assetPath: "/sounds/piano.json" } as SoundWorld;

    const resolved = resolveSoundWorld(sampled);

    expect(resolved.fellBack).toBe(true);
    expect(resolved.world.id).toBe(defaultSoundWorld().id);
    expect(resolved.reason).toMatch(/built-in tone/);
  });

  it("falls back for a synth world with no voice to render", () => {
    expect(resolveSoundWorld(without(soundWorldById("warm"), "voice")).fellBack).toBe(true);
  });
});

describe("rendering a note", () => {
  it("schedules at the time it is given rather than now", () => {
    const { context, recorded } = fakeContext();

    renderNote(context, 440, 7.5, 0.4);

    // Every prompt, metronome click, and playback note is scheduled ahead. A
    // voice that could only play immediately would break all three.
    expect(recorded.oscillators[0]?.started).toEqual([7.5]);
    expect(recorded.oscillators[0]?.stopped).toEqual([7.9]);
  });

  it("drops partials above Nyquist instead of letting them alias", () => {
    // At 8 kHz sampling, a 3 kHz note's second partial is above Nyquist and
    // would fold back as an audibly wrong pitch.
    const { context, recorded } = fakeContext(8_000);
    setActiveSoundWorld("reed");

    renderNote(context, 3_000, 0, 0.5);

    expect(recorded.oscillators).toHaveLength(1);
    expect(recorded.oscillators[0]?.frequency).toEqual([3_000]);
  });

  it("uses the world it is passed rather than the active one", () => {
    const { context, recorded } = fakeContext();

    renderNote(context, 440, 0, 0.5, soundWorldById("bright"));

    expect(getActiveSoundWorld().id).toBe(defaultSoundWorld().id);
    expect(recorded.oscillators[0]?.type).toBe("square");
  });

  it("renders through the default voice when a world carries none", () => {
    const { context, recorded } = fakeContext();

    renderNote(context, 440, 0, 0.5, without(soundWorldById("warm"), "voice"));

    expect(recorded.oscillators[0]?.type).toBe(defaultSoundWorld().voice?.wave);
  });
});

describe("previewing a world", () => {
  it("plays a short phrase without changing what practice sounds like", async () => {
    const { context, recorded } = fakeContext();
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function FakeAudioContext() {
        return context;
      }),
    );
    const { playSoundWorldPreview } = await import("../audio");

    setActiveSoundWorld("warm");
    playSoundWorldPreview(soundWorldById("bright"));

    // Three notes, so a voice can be judged on more than one attack, and all of
    // them the previewed world rather than the active one.
    expect(new Set(recorded.oscillators.map((entry) => entry.started[0])).size).toBe(3);
    expect(recorded.oscillators.every((entry) => entry.type === "square")).toBe(true);
    expect(getActiveSoundWorld().id).toBe("warm");
    vi.unstubAllGlobals();
  });
});

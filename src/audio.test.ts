import { afterEach, describe, expect, it, vi } from "vitest";

type MockAudioParam = {
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
};

type MockOscillator = {
  type: OscillatorType;
  frequency: Pick<MockAudioParam, "setValueAtTime">;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

type MockGain = {
  gain: MockAudioParam;
  connect: ReturnType<typeof vi.fn>;
};

function installAudioContextMock() {
  const oscillators: MockOscillator[] = [];
  const gains: MockGain[] = [];
  const destination = {};

  const context = {
    currentTime: 12.5,
    destination,
    createOscillator: vi.fn(() => {
      const oscillator: MockOscillator = {
        type: "sine",
        frequency: {
          setValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      oscillators.push(oscillator);
      return oscillator;
    }),
    createGain: vi.fn(() => {
      const gain: MockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };

      gains.push(gain);
      return gain;
    }),
  };

  const AudioContextMock = vi.fn(function AudioContext() {
    return context;
  });
  vi.stubGlobal("AudioContext", AudioContextMock);

  return {
    AudioContextMock,
    context,
    destination,
    gains,
    oscillators,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("playTone", () => {
  it("configures and schedules a short triangle tone", async () => {
    const { AudioContextMock, destination, gains, oscillators } = installAudioContextMock();
    const { playTone } = await import("./audio");

    playTone(440);

    const oscillator = oscillators[0];
    const gain = gains[0];
    expect(AudioContextMock).toHaveBeenCalledTimes(1);
    expect(oscillator).toBeDefined();
    expect(gain).toBeDefined();
    expect(oscillator?.type).toBe("triangle");
    expect(oscillator?.frequency.setValueAtTime).toHaveBeenCalledWith(440, 12.5);
    expect(gain?.gain.setValueAtTime).toHaveBeenCalledWith(0, 12.5);
    expect(gain?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.22, 12.52);
    expect(gain?.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 13.35);
    expect(oscillator?.connect).toHaveBeenCalledWith(gain);
    expect(gain?.connect).toHaveBeenCalledWith(destination);
    expect(oscillator?.start).toHaveBeenCalledWith(12.5);
    expect(oscillator?.stop).toHaveBeenCalledWith(13.4);
  });

  it("reuses one audio context across repeated tones", async () => {
    const { AudioContextMock, context } = installAudioContextMock();
    const { playTone } = await import("./audio");

    playTone(261.63);
    playTone(329.63);

    expect(AudioContextMock).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    expect(context.createGain).toHaveBeenCalledTimes(2);
  });
});

describe("playMelody", () => {
  it("schedules each note in order on one audio context", async () => {
    const { AudioContextMock, gains, oscillators } = installAudioContextMock();
    const { playMelody } = await import("./audio");

    playMelody([261.63, 329.63, 392]);

    expect(AudioContextMock).toHaveBeenCalledTimes(1);
    expect(oscillators).toHaveLength(3);
    expect(gains).toHaveLength(3);
    expect(oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(261.63, 12.5);
    expect(oscillators[1]?.frequency.setValueAtTime).toHaveBeenCalledWith(329.63, 13.22);
    expect(oscillators[2]?.frequency.setValueAtTime).toHaveBeenCalledWith(392, 13.94);
    expect(oscillators[2]?.stop).toHaveBeenCalledWith(14.559999999999999);
  });

  it("does not create an audio context for an empty melody", async () => {
    const { AudioContextMock } = installAudioContextMock();
    const { playMelody } = await import("./audio");

    playMelody([]);

    expect(AudioContextMock).not.toHaveBeenCalled();
  });
});

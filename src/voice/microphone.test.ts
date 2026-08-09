import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectMicSupport, startListening } from "./microphone";

// A microphone, a stream, and an analyser, all under the test's control. The
// analyser hands back a sine so the pure detector has something real to find.
function installAudioMocks(options: { denied?: boolean; noContext?: boolean } = {}) {
  const stopped: string[] = [];
  const track = { kind: "audio", stop: () => stopped.push("audio") };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;

  const analyser = {
    fftSize: 2048,
    getFloatTimeDomainData: (buffer: Float32Array) => {
      for (let index = 0; index < buffer.length; index += 1) {
        buffer[index] = 0.5 * Math.sin((2 * Math.PI * 220 * index) / 44100);
      }
    },
  };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    currentTime: 0,
    sampleRate: 44100,
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
    close: vi.fn(),
  };

  const getUserMedia = vi.fn(() => (options.denied ? Promise.reject(new Error("denied")) : Promise.resolve(stream)));
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });

  if (options.noContext) {
    vi.stubGlobal("AudioContext", function Broken() {
      throw new Error("no audio");
    });
  } else {
    vi.stubGlobal("AudioContext", function AudioContextStub() {
      return context;
    });
  }

  return { getUserMedia, stopped, source, context, analyser };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("microphone support", () => {
  it("reports what is available", () => {
    installAudioMocks();
    expect(detectMicSupport()).toBe("available");
  });

  it("says when a browser cannot do it at all", () => {
    vi.stubGlobal("navigator", {});
    expect(detectMicSupport()).toBe("unsupported");
  });

  it("says when the connection is not secure, which is a different problem", () => {
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });

    expect(detectMicSupport()).toBe("insecure-context");
  });
});

describe("listening", () => {
  it("asks for audio with speech processing turned off", async () => {
    const { getUserMedia } = installAudioMocks();

    const session = await startListening({ onFrame: vi.fn() });

    // Echo cancellation and noise suppression are tuned for speech and will
    // fight a sustained sung note, bending the pitch being measured.
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    session?.stop();
  });

  it("delivers derived frames, never samples", async () => {
    installAudioMocks();
    const onFrame = vi.fn();

    const session = await startListening({ onFrame });
    vi.advanceTimersByTime(60);

    expect(onFrame).toHaveBeenCalled();
    const frame = onFrame.mock.calls[0]?.[0];
    // This is the privacy boundary in one assertion: what leaves the audio
    // callback is five numbers, and no buffer travels with them.
    expect(Object.keys(frame).sort()).toEqual(["atSeconds", "confidence", "level", "midi", "voiced"]);
    for (const value of Object.values(frame as Record<string, unknown>)) {
      expect(["number", "boolean"]).toContain(typeof value);
    }
    session?.stop();
  });

  it("finds the pitch of what it hears", async () => {
    installAudioMocks();
    const onFrame = vi.fn();

    const session = await startListening({ onFrame });
    vi.advanceTimersByTime(60);

    const frame = onFrame.mock.calls[0]?.[0] as { midi: number; voiced: boolean };
    expect(frame.voiced).toBe(true);
    // 220Hz is A3, MIDI 57.
    expect(frame.midi).toBeCloseTo(57, 0);
    session?.stop();
  });

  it("releases the microphone on stop, so the recording indicator goes out", async () => {
    const { stopped, source, context } = installAudioMocks();

    const session = await startListening({ onFrame: vi.fn() });
    session?.stop();

    expect(stopped).toEqual(["audio"]);
    expect(source.disconnect).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
  });

  it("stops delivering frames once stopped", async () => {
    installAudioMocks();
    const onFrame = vi.fn();

    const session = await startListening({ onFrame });
    vi.advanceTimersByTime(40);
    const delivered = onFrame.mock.calls.length;

    session?.stop();
    vi.advanceTimersByTime(200);

    expect(onFrame.mock.calls.length).toBe(delivered);
  });

  it("returns nothing when permission is refused", async () => {
    const { stopped } = installAudioMocks({ denied: true });

    expect(await startListening({ onFrame: vi.fn() })).toBeNull();
    expect(stopped).toEqual([]);
  });

  it("gives the microphone back when audio cannot be set up", async () => {
    const { stopped } = installAudioMocks({ noContext: true });

    expect(await startListening({ onFrame: vi.fn() })).toBeNull();
    // The stream was granted, so it must be handed back rather than left open.
    expect(stopped).toEqual(["audio"]);
  });

  it("does not ask for a microphone at all when it cannot be used", async () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal("navigator", {});

    expect(await startListening({ onFrame: vi.fn() })).toBeNull();
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

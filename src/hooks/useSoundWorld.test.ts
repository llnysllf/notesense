import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getActiveSoundWorld } from "../sound/soundWorlds";
import { useSoundWorld } from "./useSoundWorld";

const playSoundWorldPreview = vi.fn();
vi.mock("../audio", () => ({ playSoundWorldPreview: (...args: unknown[]) => playSoundWorldPreview(...args) }));

afterEach(() => {
  playSoundWorldPreview.mockClear();
});

describe("useSoundWorld", () => {
  it("applies the stored world on mount rather than waiting for a tap", () => {
    // A world restored from storage must be the one that plays the first time
    // a prompt sounds.
    const { result } = renderHook(() => useSoundWorld("reed", vi.fn()));

    expect(getActiveSoundWorld().id).toBe("reed");
    expect(result.current.activeId).toBe("reed");
  });

  it("follows the setting when it changes", () => {
    const { result, rerender } = renderHook(({ id }) => useSoundWorld(id, vi.fn()), {
      initialProps: { id: "warm" },
    });

    rerender({ id: "bright" });

    expect(result.current.activeId).toBe("bright");
    expect(getActiveSoundWorld().id).toBe("bright");
  });

  it("reports the world actually in use, not the one asked for", () => {
    // Showing the requested id would tell the learner they are hearing
    // something they are not.
    const { result } = renderHook(() => useSoundWorld("no-such-world", vi.fn()));

    expect(result.current.activeId).toBe("synth");
  });

  it("hands a chosen id back to the caller instead of storing it itself", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useSoundWorld("synth", onSelect));

    act(() => result.current.select("warm"));

    expect(onSelect).toHaveBeenCalledWith("warm");
  });

  it("previews a world without making it active", () => {
    const { result } = renderHook(() => useSoundWorld("synth", vi.fn()));

    act(() => result.current.preview("reed"));

    expect(playSoundWorldPreview).toHaveBeenCalledWith(expect.objectContaining({ id: "reed" }));
    expect(result.current.activeId).toBe("synth");
  });

  it("has nothing to report while the chosen world is the one playing", () => {
    const { result } = renderHook(() => useSoundWorld("warm", vi.fn()));

    expect(result.current.notice).toBeNull();
  });

  it("passes on the reason when something else is being heard", async () => {
    // Only synth worlds ship today, so the fallback path is forced here. It is
    // the path a sampled pack would take on a device that cannot load it, and
    // going quiet about that is what makes a learner think the app is broken.
    vi.resetModules();
    vi.doMock("../sound/soundWorlds", () => ({
      setActiveSoundWorld: () => ({ world: { id: "synth" }, fellBack: true }),
      resolveSoundWorld: () => ({ world: { id: "synth" }, fellBack: true, reason: "Using the built-in tone." }),
    }));
    const { useSoundWorld: withFallback } = await import("./useSoundWorld");

    const { result } = renderHook(() => withFallback("piano-pack", vi.fn()));

    expect(result.current.notice).toBe("Using the built-in tone.");
    vi.doUnmock("../sound/soundWorlds");
    vi.resetModules();
  });

  it("says nothing rather than an empty notice when a fallback gives no reason", async () => {
    vi.resetModules();
    vi.doMock("../sound/soundWorlds", () => ({
      setActiveSoundWorld: () => ({ world: { id: "synth" }, fellBack: true }),
      resolveSoundWorld: () => ({ world: { id: "synth" }, fellBack: true }),
    }));
    const { useSoundWorld: withFallback } = await import("./useSoundWorld");

    const { result } = renderHook(() => withFallback("piano-pack", vi.fn()));

    expect(result.current.notice).toBeNull();
    vi.doUnmock("../sound/soundWorlds");
    vi.resetModules();
  });
});

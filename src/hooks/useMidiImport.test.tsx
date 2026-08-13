import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMidiImport } from "./useMidiImport";

// A minimal real MIDI file, built here so the test exercises the parser rather
// than a stand-in for it.
function variable(value: number): number[] {
  const out = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    out.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return out;
}

function chunk(tag: string, body: number[]): number[] {
  const id = [...tag].map((character) => character.charCodeAt(0));
  const n = body.length;
  return [...id, (n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff, ...body];
}

function midiBytes(midis: number[] = [60, 64, 67, 72]): Uint8Array {
  const track = midis.flatMap((midi) => [...variable(0), 0x90, midi, 80, ...variable(480), 0x80, midi, 0]);
  track.push(...variable(0), 0xff, 0x2f, 0x00);
  return new Uint8Array([...chunk("MThd", [0, 1, 0, 1, 0x01, 0xe0]), ...chunk("MTrk", track)]);
}

function fileFrom(bytes: Uint8Array, name = "minuet.mid"): File {
  const file = new File([bytes as BlobPart], name, { type: "audio/midi" });
  // jsdom's File does not implement arrayBuffer streaming into FileReader
  // consistently, so the bytes are provided directly.
  Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(bytes.buffer) });
  return file;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useMidiImport", () => {
  it("starts with nothing loaded", () => {
    const { result } = renderHook(() => useMidiImport());

    expect(result.current.file).toBeNull();
    expect(result.current.preview).toBeNull();
    expect(result.current.saved).toEqual([]);
  });

  it("reads a file and previews what it will produce", async () => {
    const { result } = renderHook(() => useMidiImport());

    act(() => result.current.openFile(fileFrom(midiBytes())));

    await waitFor(() => expect(result.current.file).not.toBeNull());
    expect(result.current.preview?.song.events.map((event) => event.noteIds[0])).toEqual(["C4", "E4", "G4", "C5"]);
    // The title comes from the file name, without its extension.
    expect(result.current.preview?.song.title).toBe("minuet");
  });

  it("says why a file could not be read, rather than failing silently", async () => {
    const { result } = renderHook(() => useMidiImport());

    act(() => result.current.openFile(fileFrom(new Uint8Array([1, 2, 3, 4]), "notes.txt")));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toMatch(/not a MIDI file/i);
    expect(result.current.preview).toBeNull();
  });

  it("re-previews when the options change", async () => {
    const { result } = renderHook(() => useMidiImport());
    act(() => result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(result.current.file).not.toBeNull());

    act(() => result.current.setTranspose(12));

    expect(result.current.preview?.song.events[0]?.noteIds).toEqual(["C5"]);
  });

  it("clamps a wild transpose rather than producing notes off the piano", async () => {
    const { result } = renderHook(() => useMidiImport());
    act(() => result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(result.current.file).not.toBeNull());

    act(() => result.current.setTranspose(500));

    expect(result.current.transpose).toBe(24);
  });

  it("saves a piece to the learner's own songs", async () => {
    const { result } = renderHook(() => useMidiImport());
    act(() => result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(result.current.file).not.toBeNull());

    act(() => result.current.save());

    expect(result.current.saved).toHaveLength(1);
    expect(result.current.savedMessage).toMatch(/Saved to your songs/i);
    expect(window.localStorage.getItem("notesense.importedSongs.v1")).not.toBeNull();
  });

  it("keeps saved pieces across a reload", async () => {
    const first = renderHook(() => useMidiImport());
    act(() => first.result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(first.result.current.file).not.toBeNull());
    act(() => first.result.current.save());

    const second = renderHook(() => useMidiImport());
    expect(second.result.current.saved).toHaveLength(1);
  });

  it("removes a saved piece", async () => {
    const { result } = renderHook(() => useMidiImport());
    act(() => result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(result.current.file).not.toBeNull());
    act(() => result.current.save());

    act(() => result.current.remove(result.current.saved[0]?.id ?? ""));

    expect(result.current.saved).toEqual([]);
  });

  it("refuses to keep more pieces than the cap allows", async () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      id: `imported-${index}`,
      title: `Piece ${index}`,
      source: "imported" as const,
      clef: "treble" as const,
      timeSignature: { beatsPerMeasure: 4, beatUnit: "quarter" as const },
      events: [
        { noteIds: ["C4"], duration: "quarter" as const },
        { noteIds: ["E4"], duration: "quarter" as const },
        { noteIds: ["G4"], duration: "quarter" as const },
        { noteIds: ["C5"], duration: "quarter" as const },
      ],
    }));
    window.localStorage.setItem("notesense.importedSongs.v1", JSON.stringify({ songs: many }));

    const { result } = renderHook(() => useMidiImport());
    act(() => result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(result.current.file).not.toBeNull());

    act(() => result.current.save());

    expect(result.current.saved).toHaveLength(20);
    expect(result.current.savedMessage).toMatch(/Remove one to add another/i);
  });

  it("says so when a piece cannot be written to this device", async () => {
    const { result } = renderHook(() => useMidiImport());
    act(() => result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(result.current.file).not.toBeNull());
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    act(() => result.current.save());

    expect(result.current.savedMessage).toMatch(/could not be saved/i);
  });

  it("never reaches the network while importing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() => useMidiImport());

    act(() => result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(result.current.file).not.toBeNull());
    act(() => result.current.save());

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("refuses to claim it saved a piece too short to keep", async () => {
    const { result } = renderHook(() => useMidiImport());
    act(() => result.current.openFile(fileFrom(midiBytes([60, 64]))));
    await waitFor(() => expect(result.current.file).not.toBeNull());

    act(() => result.current.save());

    // The library will not read back a two-note piece, so reporting success
    // here would mean it vanishes on reload.
    expect(result.current.saved).toEqual([]);
    expect(result.current.savedMessage).toMatch(/too short to practise/i);
  });

  it("clears a loaded file on request", async () => {
    const { result } = renderHook(() => useMidiImport());
    act(() => result.current.openFile(fileFrom(midiBytes())));
    await waitFor(() => expect(result.current.file).not.toBeNull());

    act(() => result.current.clearFile());

    expect(result.current.file).toBeNull();
    expect(result.current.fileName).toBe("");
  });
});

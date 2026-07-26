import { describe, expect, it } from "vitest";
import { createRegistry } from "./generator";
import { readingNoteGenerator } from "./generators/readingNote";
import { pitchNoteGenerator } from "./generators/pitchNote";

describe("createRegistry", () => {
  const registry = createRegistry([readingNoteGenerator, pitchNoteGenerator]);

  it("exposes and dispatches to registered generators", () => {
    expect(registry.kinds().sort()).toEqual(["ear.pitch", "reading.staff-to-key"]);
    expect(registry.get("ear.pitch")).toBe(pitchNoteGenerator);
    expect(registry.generate("reading.staff-to-key", { seed: "s" })?.kind).toBe("reading.staff-to-key");
    expect(registry.generate("missing", { seed: "s" })).toBeUndefined();
  });

  it("rejects duplicate generator kinds", () => {
    expect(() => createRegistry([readingNoteGenerator, readingNoteGenerator])).toThrow(/duplicate/);
  });
});

import { describe, expect, it } from "vitest";
import { createRng, hashString, mulberry32, pick, randInt } from "./seededRng";

describe("seededRng", () => {
  it("hashes strings deterministically and distinctly", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("produces a reproducible sequence per seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA[0]).toBeGreaterThanOrEqual(0);
    expect(seqA[0]).toBeLessThan(1);
  });

  it("derives a stable rng from a string seed", () => {
    const first = createRng("seed-1");
    const second = createRng("seed-1");
    expect(first()).toBe(second());
  });

  it("draws integers in range and picks members", () => {
    const rng = createRng("range");
    for (let i = 0; i < 200; i += 1) {
      const value = randInt(rng, 3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
    }
    expect(["x", "y", "z"]).toContain(pick(createRng("pick"), ["x", "y", "z"]));
  });
});

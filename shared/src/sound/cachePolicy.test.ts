import { describe, expect, it } from "vitest";
import {
  canCache,
  cachedBytes,
  describeCache,
  normalizeCacheIndex,
  planCache,
  SOUND_CACHE_BUDGET_BYTES,
  type CachedPack,
} from "./cachePolicy";

const MB = 1024 * 1024;

function pack(id: string, mb: number, lastUsedAt: number): CachedPack {
  return { id, bytes: mb * MB, lastUsedAt };
}

describe("what stays downloaded", () => {
  it("keeps everything while there is room", () => {
    const cached = [pack("a", 4, 1), pack("b", 4, 2)];

    const plan = planCache({ cached, incoming: pack("c", 4, 3) });

    expect(plan.evict).toEqual([]);
    expect(plan.keep).toHaveLength(3);
  });

  it("evicts the least recently used when the budget is exceeded", () => {
    const cached = [pack("old", 10, 1), pack("recent", 10, 500)];

    const plan = planCache({ cached, incoming: pack("new", 10, 900) });

    expect(plan.evict.map((entry) => entry.id)).toEqual(["old"]);
    expect(plan.keep.map((entry) => entry.id)).toEqual(["recent", "new"]);
    expect(plan.bytesAfter).toBeLessThanOrEqual(SOUND_CACHE_BUDGET_BYTES);
  });

  it("never evicts the pack currently being listened to", () => {
    const cached = [pack("in-use", 10, 1), pack("newer", 10, 500)];

    const plan = planCache({ cached, incoming: pack("new", 10, 900), inUseId: "in-use" });

    // The oldest is in use, so the next-oldest goes instead. Deleting the pack
    // someone is practising with would be the worst possible choice.
    expect(plan.evict.map((entry) => entry.id)).toEqual(["newer"]);
  });

  it("never evicts the pack it was asked to add", () => {
    const cached = [pack("a", 10, 900), pack("b", 10, 800)];

    const plan = planCache({ cached, incoming: pack("new", 10, 1) });

    // The incoming pack has the oldest timestamp here, but a plan that throws
    // away what it just downloaded is not a plan.
    expect(plan.evict.map((entry) => entry.id)).not.toContain("new");
    expect(plan.keep.map((entry) => entry.id)).toContain("new");
  });

  it("replaces an older copy of the same pack rather than counting it twice", () => {
    const cached = [pack("a", 10, 1)];

    const plan = planCache({ cached, incoming: pack("a", 12, 900) });

    expect(plan.keep).toHaveLength(1);
    expect(plan.keep[0]?.bytes).toBe(12 * MB);
  });

  it("evicts as many as it takes to get under budget", () => {
    const cached = [pack("a", 8, 1), pack("b", 8, 2), pack("c", 8, 3)];

    const plan = planCache({ cached, incoming: pack("d", 20, 900) });

    expect(plan.bytesAfter).toBeLessThanOrEqual(SOUND_CACHE_BUDGET_BYTES);
    expect(plan.evict.length).toBeGreaterThanOrEqual(2);
  });

  it("plans without an incoming pack, for a plain tidy-up", () => {
    const cached = [pack("a", 20, 1), pack("b", 20, 2)];

    const plan = planCache({ cached });

    expect(plan.evict.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("refuses a pack larger than the whole budget up front", () => {
    // Downloading it only to evict it immediately would waste the learner's
    // data to achieve nothing.
    expect(canCache(SOUND_CACHE_BUDGET_BYTES + 1)).toBe(false);
    expect(canCache(SOUND_CACHE_BUDGET_BYTES)).toBe(true);
    expect(canCache(0)).toBe(false);
  });

  it("adds up what is stored", () => {
    expect(cachedBytes([pack("a", 2, 1), pack("b", 3, 2)])).toBe(5 * MB);
    expect(cachedBytes([])).toBe(0);
  });
});

describe("reading the stored cache index", () => {
  it("reads valid entries", () => {
    const index = normalizeCacheIndex([{ id: "a", bytes: 1024, lastUsedAt: 5 }]);

    expect(index).toEqual([{ id: "a", bytes: 1024, lastUsedAt: 5 }]);
  });

  it("drops entries that cannot be trusted", () => {
    const index = normalizeCacheIndex([
      { id: "a", bytes: 1024, lastUsedAt: 5 },
      { id: "", bytes: 10 },
      { id: "b", bytes: -5 },
      { id: "c", bytes: "big" },
      { id: "a", bytes: 2048 },
      "nonsense",
      null,
    ]);

    expect(index.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("returns nothing for input that is not a list", () => {
    expect(normalizeCacheIndex({ packs: [] })).toEqual([]);
    expect(normalizeCacheIndex(undefined)).toEqual([]);
  });

  it("treats a missing timestamp as oldest rather than newest", () => {
    // Getting this backwards would make an unknown pack the last thing evicted.
    expect(normalizeCacheIndex([{ id: "a", bytes: 10 }])[0]?.lastUsedAt).toBe(0);
  });
});

describe("describing what is stored", () => {
  it("says when nothing is downloaded", () => {
    expect(describeCache([])).toMatch(/no sound packs/i);
  });

  it("puts a size in context rather than stating it bare", () => {
    const description = describeCache([pack("a", 6, 1)]);

    expect(description).toContain("6.0 MB");
    expect(description).toContain("24 MB");
  });
});

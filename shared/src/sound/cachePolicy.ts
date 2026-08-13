// What stays downloaded, and what gets thrown away.
//
// Sound packs are the first thing in this app big enough that keeping all of
// them is a real cost to someone's device. The policy is deliberately boring:
// a byte budget, least-recently-used eviction, and nothing evicted that is
// currently in use. Boring is the point — a cache that surprises you is a cache
// that deletes the pack you are practising with.
//
// Pure bookkeeping. It decides *what* to keep; downloading and deleting are the
// browser's job, in the layer above.

export type CachedPack = {
  id: string;
  bytes: number;
  // Milliseconds since the epoch. Used only for ordering, never displayed.
  lastUsedAt: number;
};

// Roughly one large pack plus a couple of small ones. Small enough that a
// learner who never thinks about it is never surprised by their storage.
export const SOUND_CACHE_BUDGET_BYTES = 24 * 1024 * 1024;

export type EvictionPlan = {
  keep: CachedPack[];
  evict: CachedPack[];
  bytesAfter: number;
};

export type PlanCacheOptions = {
  cached: readonly CachedPack[];
  // The pack about to be added, if any.
  incoming?: CachedPack;
  // Never evicted, however old: the learner is listening to it right now.
  inUseId?: string;
  budgetBytes?: number;
};

// Works out what to keep. Deterministic in its input, so the same cache state
// always produces the same plan and a test can assert it.
export function planCache({
  cached,
  incoming,
  inUseId,
  budgetBytes = SOUND_CACHE_BUDGET_BYTES,
}: PlanCacheOptions): EvictionPlan {
  // The incoming pack replaces any older copy of itself rather than being
  // counted twice.
  const withoutIncoming = incoming ? cached.filter((pack) => pack.id !== incoming.id) : [...cached];
  const all = incoming ? [...withoutIncoming, incoming] : withoutIncoming;

  const total = all.reduce((sum, pack) => sum + pack.bytes, 0);
  if (total <= budgetBytes) return { keep: all, evict: [], bytesAfter: total };

  // Oldest first, but never the one in use and never the incoming one — a plan
  // that evicts what it was asked to add is not a plan.
  const evictable = all
    .filter((pack) => pack.id !== inUseId && pack.id !== incoming?.id)
    .sort((a, b) => a.lastUsedAt - b.lastUsedAt);

  const evict: CachedPack[] = [];
  let bytes = total;
  for (const pack of evictable) {
    if (bytes <= budgetBytes) break;
    evict.push(pack);
    bytes -= pack.bytes;
  }

  const evicted = new Set(evict.map((pack) => pack.id));
  return { keep: all.filter((pack) => !evicted.has(pack.id)), evict, bytesAfter: bytes };
}

// Whether a pack can be added at all. A single pack larger than the whole
// budget is refused up front rather than downloaded and immediately evicted,
// which would waste the learner's data to achieve nothing.
export function canCache(bytes: number, budgetBytes = SOUND_CACHE_BUDGET_BYTES): boolean {
  return bytes > 0 && bytes <= budgetBytes;
}

export function cachedBytes(cached: readonly CachedPack[]): number {
  return cached.reduce((sum, pack) => sum + pack.bytes, 0);
}

// Reads a stored cache index. Untrusted, because it is on disk and editable.
export function normalizeCacheIndex(value: unknown): CachedPack[] {
  if (!Array.isArray(value)) return [];
  const packs: CachedPack[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim().slice(0, 60) : "";
    if (id.length === 0 || seen.has(id)) continue;
    if (typeof candidate.bytes !== "number" || !Number.isFinite(candidate.bytes) || candidate.bytes <= 0) continue;
    const lastUsedAt =
      typeof candidate.lastUsedAt === "number" && Number.isFinite(candidate.lastUsedAt) ? candidate.lastUsedAt : 0;

    seen.add(id);
    packs.push({ id, bytes: Math.round(candidate.bytes), lastUsedAt });
  }

  return packs;
}

// How much room a learner has left, in words. Shown next to a pack's size so
// "12 MB" means something before they commit to it.
export function describeCache(cached: readonly CachedPack[], budgetBytes = SOUND_CACHE_BUDGET_BYTES): string {
  const used = cachedBytes(cached);
  if (used === 0) return "No sound packs downloaded.";
  const usedMb = (used / (1024 * 1024)).toFixed(1);
  const budgetMb = Math.round(budgetBytes / (1024 * 1024));
  return `${usedMb} MB of ${budgetMb} MB used by sound packs.`;
}

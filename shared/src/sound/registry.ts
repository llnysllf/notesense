// The sound worlds that ship with the app.
//
// All of them are synthesized. That is a deliberate limit, not an oversight:
// a sampled piano is somebody's recording, and adding one is a licensing and
// bundle decision that belongs to whoever owns the project, not to whoever
// happens to be writing this file. The manifest contract, the loader, the
// cache, and the fallback are all built and tested so a pack can be dropped in
// once that decision is made — but nothing here downloads anything.
//
// The plain synth stays the default, so core practice needs no download and
// works the first time, offline, forever.

import { validateSoundWorld, type SoundWorld } from "./soundWorld";

export const DEFAULT_SOUND_WORLD_ID = "synth";

// Partials are relative levels above the fundamental. A couple of low ones read
// as warm; adding odd upper ones reads as reedy. These are shaped by ear to be
// *distinguishable*, which is what ear practice needs — a learner should be able
// to tell they changed something.
export const BUILT_IN_SOUND_WORLDS: readonly SoundWorld[] = [
  {
    id: DEFAULT_SOUND_WORLD_ID,
    label: "Plain",
    description: "The built-in tone. Clear, quick to start, and always available.",
    kind: "synth",
    version: 1,
    license: "public-domain",
    attribution: "NoteSense built-in synthesis",
    approxBytes: 0,
    voice: { wave: "triangle", attackSeconds: 0.02, decayShare: 0.94, peakGain: 0.22, partials: [] },
    lowMidi: 21,
    highMidi: 108,
  },
  {
    id: "warm",
    label: "Warm",
    description: "Rounder and softer, with a gentler attack. Easier on the ear over a long session.",
    kind: "synth",
    version: 1,
    license: "public-domain",
    attribution: "NoteSense built-in synthesis",
    approxBytes: 0,
    voice: { wave: "sine", attackSeconds: 0.05, decayShare: 0.85, peakGain: 0.26, partials: [0.3, 0.12] },
    lowMidi: 21,
    highMidi: 108,
  },
  {
    id: "bright",
    label: "Bright",
    description: "A sharper, more percussive sound. Onsets are easier to place in rhythm work.",
    kind: "synth",
    version: 1,
    license: "public-domain",
    attribution: "NoteSense built-in synthesis",
    approxBytes: 0,
    voice: { wave: "square", attackSeconds: 0.005, decayShare: 0.55, peakGain: 0.16, partials: [0.25] },
    lowMidi: 21,
    highMidi: 108,
  },
  {
    id: "reed",
    label: "Reed",
    description: "A sustained, reedy tone that holds steady — useful when matching pitch by ear.",
    kind: "synth",
    version: 1,
    license: "public-domain",
    attribution: "NoteSense built-in synthesis",
    approxBytes: 0,
    voice: { wave: "sawtooth", attackSeconds: 0.08, decayShare: 0.98, peakGain: 0.14, partials: [0.2, 0.1, 0.05] },
    lowMidi: 21,
    highMidi: 108,
  },
];

export function soundWorldById(id: string, worlds: readonly SoundWorld[] = BUILT_IN_SOUND_WORLDS): SoundWorld {
  return worlds.find((world) => world.id === id) ?? (worlds[0] as SoundWorld);
}

export function defaultSoundWorld(): SoundWorld {
  return BUILT_IN_SOUND_WORLDS[0] as SoundWorld;
}

// Every shipped world must pass its own manifest rules. Run as a test and by
// the content gate, so an unlicensed or unusable world cannot reach a release
// simply because someone added it to the array above.
export function validateBuiltInSoundWorlds(
  worlds: readonly SoundWorld[] = BUILT_IN_SOUND_WORLDS,
): { id: string; problem: string }[] {
  const issues = worlds.flatMap(validateSoundWorld);
  const ids = worlds.map((world) => world.id);
  if (new Set(ids).size !== ids.length) issues.push({ id: "registry", problem: "duplicate sound world id" });
  if (ids[0] !== DEFAULT_SOUND_WORLD_ID) {
    issues.push({ id: "registry", problem: "the zero-download synth must be first, and the default" });
  }
  return issues;
}

// Whether a world can be used across a pitch range without a caveat. A pack
// checked over two octaves should not be silently trusted across seven.
export function coversRange(world: SoundWorld, lowMidi: number, highMidi: number): boolean {
  return world.lowMidi <= lowMidi && world.highMidi >= highMidi;
}

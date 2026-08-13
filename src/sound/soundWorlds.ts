// Playing a note in the chosen sound world.
//
// A thin layer over `src/audio.ts`: the scheduling, the clock, and the audio
// context stay there, and this decides only what a voice sounds like. Keeping
// the split means adding a sound world cannot break the timing that rhythm,
// assessment, and singing all depend on.
//
// Everything here is synthesis, and nothing here reaches the network. The
// manifest contract already describes sampled packs so the seam is defined, but
// no download code exists until a pack is actually approved — carrying an
// unused fetch path would widen the client surface and the content policy for
// something no learner can use.

import { defaultSoundWorld, soundWorldById, BUILT_IN_SOUND_WORLDS, type SoundWorld, type SynthVoice } from "../types";

let activeWorld: SoundWorld = defaultSoundWorld();

// Selecting a world resolves it first, so a world this device cannot actually
// play never becomes the active one. An unknown id resolves to the default
// rather than to silence.
export function setActiveSoundWorld(id: string): ResolvedWorld {
  const resolved = resolveSoundWorld(soundWorldById(id, BUILT_IN_SOUND_WORLDS));
  activeWorld = resolved.world;
  return resolved;
}

export function getActiveSoundWorld(): SoundWorld {
  return activeWorld;
}

// Renders one note. Given a context and a start time so it can be scheduled
// ahead like every other sound in the app — a voice that could only play "now"
// would be unusable for a metronome or a playback cursor.
export function renderNote(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  world: SoundWorld = activeWorld,
): void {
  const voice = world.voice ?? (defaultSoundWorld().voice as SynthVoice);
  const gain = context.createGain();
  const releaseAt = startAt + Math.max(0.08, duration * voice.decayShare);

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(voice.peakGain, startAt + voice.attackSeconds);
  gain.gain.exponentialRampToValueAtTime(0.001, releaseAt);
  gain.connect(context.destination);

  // The fundamental, plus whatever partials the world asks for. Partials are
  // what make one world sound different from another rather than just louder.
  const levels = [1, ...voice.partials];
  levels.forEach((level, index) => {
    const partialHz = frequency * (index + 1);
    // Above Nyquist a partial folds back as an audible wrong pitch, so it is
    // dropped rather than allowed to alias.
    if (partialHz >= context.sampleRate / 2) return;

    const oscillator = context.createOscillator();
    const partialGain = context.createGain();
    oscillator.type = voice.wave;
    oscillator.frequency.setValueAtTime(partialHz, startAt);
    partialGain.gain.setValueAtTime(level, startAt);

    oscillator.connect(partialGain);
    partialGain.connect(gain);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
  });
}

export type ResolvedWorld = { world: SoundWorld; fellBack: boolean; reason?: string };

// Decides what will actually be heard.
//
// No sampled pack ships today, and deliberately so: an asset needs a licence,
// a size budget, and a content-policy decision that belong to whoever owns the
// project. Rather than carry an unused download path — which would mean adding
// `fetch` to the client surface and widening the content policy for a feature
// nobody can use yet — a world that needs an asset falls back to the synth and
// says so. When a pack is approved, this is the one function that changes.
export function resolveSoundWorld(world: SoundWorld): ResolvedWorld {
  if (world.kind === "synth" && world.voice) return { world, fellBack: false };
  return {
    world: defaultSoundWorld(),
    fellBack: true,
    reason: "That sound is not available on this device, so practice uses the built-in tone.",
  };
}

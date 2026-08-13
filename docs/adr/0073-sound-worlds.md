# ADR 0073: Sound Worlds And Bundled Audio Licensing

## Status

Accepted

## Context

Every sound the app makes — reading prompts, ear-training stimuli, melody playback, the metronome — came out of a
single hard-coded triangle oscillator. That is thin for a tool people spend months with, and it is actively bad for
ear training, where a learner should be able to recognise an interval in more than one timbre.

The obvious answer is a sampled piano. It is also the answer that quietly commits the project to three things it
has not decided: a licence for somebody else's recording, tens of megabytes of download against a budget currently
measured in kilobytes, and a network request from a client that today makes none. `npm run runtime:check` bans
`fetch(` for exactly that reason.

Audio assets are content, not code, and the failure mode is specific: unlicensed audio does not ship because
someone decides to ship it, but because nobody checks. A "sound packs" feature with no rule about what a pack is
allowed to be is how that happens.

## Decision

**The manifest is the feature.** A `SoundWorld` declares its licence, its attribution, its size, and the pitch
range it has been checked over. `validateSoundWorld` rejects a licence outside `ALLOWED_ASSET_LICENSES` rather than
assuming an unknown one is acceptable, refuses a sampled world that points at another origin, and refuses a synth
world that claims a download. `normalizeSoundWorld` cannot launder an invalid world into a valid one: it validates
after normalizing and returns nothing if the result still fails. The registry checks itself against those rules,
and does so for a candidate list rather than only the array that ships today, so adding a world is checked rather
than trusted.

**Nothing downloads, deliberately.** All four shipped worlds — Plain, Warm, Bright, Reed — are synthesized in the
browser from a voice definition of waveform, envelope, and partial levels. The picker therefore costs bytes only in
the manifest, works offline the first time, and needs no permission, no storage, and no request. This follows the
precedent set for the router in Slice 5 and the engraver in ADR 0072: where a dependency decision is really the
project owner's, the seam is built and tested and the decision is left open.

So the seam is complete and unused. `cachePolicy.ts` holds an LRU plan under a 24 MB budget that refuses an
oversized pack up front, never evicts the pack being practised with, and never evicts the one it was just asked to
add. `resolveSoundWorld` falls back to the built-in tone and says which world is actually being heard. When a pack
is approved, `resolveSoundWorld` is the one function that changes.

**Choosing and hearing are separate controls.** Preview plays a three-note phrase in a world without making it
active, because comparing two voices should not mean changing your settings twice. One note would not be enough to
judge a voice on; three give an onset, a middle, and a release.

**Size and licence are shown for every world**, not only for hypothetical downloadable ones, so "no download" is
something a learner can read rather than something they have to assume.

**Every sound goes through the active world.** `scheduleTone` in `src/audio.ts` delegates to `renderNote`, so ear
training, melody playback, and reading prompts change together rather than leaving one screen on the old voice.
Partials above Nyquist are dropped rather than allowed to fold back as an audibly wrong pitch — at a low sample
rate a bright voice on a high note would otherwise play something that is not the note.

**The setting stores an id, not a voice.** A world that is renamed or withdrawn resolves to the built-in tone
instead of pinning a stale definition, and an export from a newer build cannot carry a voice this build does not
have.

## Consequences

- Bundled audio now has a licensing rule with a check behind it, recorded in [LEGAL.md](../LEGAL.md). Adding an
  asset requires owner approval and an allowlist change in the same commit.
- No sampled instrument ships, so the app still sounds synthetic. That is the accepted cost of not making a
  licensing and bundle decision on the owner's behalf.
- The cache policy and the fallback are tested but not exercised in production. They are there so the decision to
  add a pack is a content decision rather than an engineering project.
- Sound worlds add no bundle weight beyond the manifest, so the existing budget in [PERFORMANCE.md](../PERFORMANCE.md)
  is unchanged; the 24 MB pack cap is device storage, tracked separately from shipped bytes.
- Choosing a world is a setting and is exported with the rest, so the data contract gained a field but not a new
  storage key.

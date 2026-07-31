# ADR 0068: Add Web MIDI As An Input Source

## Status

Accepted

## Context

NoteSense asked pianists to answer on an on-screen keyboard. That is fine for recognising a note but it is not playing, and the product's premise — connecting notation, hearing, and the instrument — is hollow if the instrument is a mouse. A learner with a digital piano should be able to use it.

Web MIDI makes that possible but brings three constraints that are easy to get wrong: it is permission-gated and the prompt only appears from a user gesture, it requires a secure context, and it is not available in every browser. It also has a wire format with two traps — a note-on with velocity 0 is a release, and the sustain pedal is a continuous controller read against a threshold, not a boolean.

Slice 8 left a related gap: the rhythm grader honours a `latencyMs` correction that nothing measured, so on a slow device a learner reads as consistently late when the hardware was late.

## Decision

Add MIDI as an input source, with the device-independent parts pure and testable.

`shared/src/midi/message.ts` parses the wire format and models sustain properly. A key that comes up under the pedal has not stopped sounding, so the tracker reports a release when the note actually ends rather than when the key rises; without that, pedalled playing looks like notes that never end. Anything malformed is ignored rather than guessed at.

`shared/src/midi/adapter.ts` converts messages into the Slice 3 `InputEvent`s. The runtime never learns that MIDI exists: a note played on a piano and a note tapped on screen arrive in the same shape and are graded by the same scorer, which makes "touch and MIDI produce comparable answers" true by construction rather than by keeping two paths in step.

`shared/src/midi/latency.ts` closes the Slice 8 gap. It estimates device delay from click-and-play samples using a **median** (one distracted note should not move it) with a **median absolute deviation** for spread. It refuses to produce a correction it does not trust — too few samples, too much variation, an implausibly large delay, or a learner playing _ahead_ of the beat — and says which, because "try again" with no reason is not guidance.

Browser handling is by runtime detection, never a hardcoded browser list: a support matrix written today goes stale, but feature detection stays true. The panel distinguishes _unsupported_, _insecure context_, and _permission denied_, names the browsers that work today, and says the on-screen keyboard still works. It is always rendered — a control that vanishes reads as a bug, one that does nothing reads as broken.

Device labels come from the hardware, are disambiguated when two identical instruments are attached, and are shown only to the person who plugged them in. Nothing about the device is stored or transmitted; access is requested without SysEx.

## Consequences

- A pianist can answer any existing drill on their own instrument, with no change to grading, evidence, or the daily plan.
- Sustained and pedalled playing is modelled correctly rather than producing stuck notes.
- Timing feedback can be corrected for a measured device delay instead of blaming the learner for their hardware — though the calibration flow that collects samples is not yet wired to a screen; the estimator and the correction path are.
- An unsupported browser, a denied prompt, or an unplugged cable all degrade to the on-screen keyboard rather than to an error.
- MIDI output, SysEx, and device-specific drivers stay out of scope.
- Changes to the wire-format handling, the sustain model, or the latency policy require testing and accessibility review.

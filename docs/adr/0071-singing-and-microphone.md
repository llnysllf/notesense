# ADR 0071: Singing And Microphone Analysis

## Status

Accepted

## Context

Reading, rhythm, and ear training all stop at recognition. Singing is where a learner has to produce the pitch
themselves, and it is the fastest way to find out whether they actually hear what they think they hear.

It is also the first feature that asks for a microphone, which changes the nature of the promise the app is
making. Everything before this was local because there was no reason for it not to be. Audio is different: a
microphone is a live feed of someone's home, and a learner is right to want to know exactly what happens to it
before they press record.

## Decision

**Raw audio has nowhere to go.** `src/voice/microphone.ts` is the only file that touches audio input. It reads a
frame into one reused buffer, hands it to the pure detector, and receives a single estimate back. Nothing
downstream of that call ever holds samples, because the samples no longer exist — the buffer is overwritten by
the next frame. "We do not store or send your voice" is therefore a property of the shape of the code rather
than a policy sentence, and the tests assert it by spying on `fetch` and `localStorage` across a full take.

What can be kept is a `SungSummary`: five derived numbers, defined back in Slice 2 precisely so this slice would
have somewhere honest to put its output. Pitch frames and the contour live for the length of a take and are
dropped when it ends.

**Detection is normalized autocorrelation, not an FFT peak.** A sung vowel has a strong harmonic series, and an
FFT will happily report the second harmonic as the fundamental — telling a learner they sang an octave high
when they did not. The search takes the first peak above the voicing threshold rather than the tallest, because
a periodic signal correlates just as well at twice its period. It also steps past the opening shoulder: at tiny
lags the signal has barely moved, so correlation starts near 1 and falls, and treating that descent as a peak
reports a pitch several octaves above anything singable. That mistake was made and caught here.

**Vibrato is not a fault.** This is the decision most likely to be got wrong by accident. Vibrato is a periodic
wobble of a few hertz, and a naive steadiness measure reads it as instability — telling a trained singer their
good habit is a defect. Stability is therefore measured on a slow-moving centre line, averaged over a window
longer than one vibrato cycle, so what remains is genuine drift. The contour's de-spiking uses a three-frame
median for the same reason: long enough to remove one wild frame, short enough to leave the wobble intact.

**Tone quality is never graded.** The components are pitch centre, stability, transitions, rhythm, and
completion — the things a teacher would name and a learner can act on. How a voice sounds is subjective,
culturally loaded, and not something a browser should be scoring. A test asserts the wording never mentions it.

**Nothing is written where the learner cannot sing it.** Phrases are generated against the learner's own range
and fitted by whole octaves, so the exercise keeps its shape and its key. Calibration returns _nothing_ rather
than a guess when there was too little singing to tell, because a wrong range silently makes every later
exercise impossible.

Speech processing is requested off — echo cancellation, noise suppression, and automatic gain all fight a
sustained note and bend the pitch being measured.

## Consequences

- A learner can check that what they hear, they can also produce, with feedback naming the specific thing to fix.
- The privacy promise is verifiable rather than asserted: no audio persistence, no audio network, tested.
- Vibrato survives the steadiness measure instead of being punished by it.
- Pitch detection runs on the main thread via an `AnalyserNode`. An `AudioWorklet` would move the arithmetic off
  it, and is worth doing when the detector costs more than it does today; the pure detector is already written
  so that move requires no change to it.
- **The detector is verified against synthesized tones, not against real voices in real rooms.** Sine and
  harmonic fixtures prove the arithmetic; they do not prove the thing works for a person with a cheap microphone
  and a noisy kitchen. That test needs actual singers and has not been run.
- The product-evidence gate — feedback correlating with a teacher's judgement — is not met by anything in this
  slice and cannot be met without a teacher.

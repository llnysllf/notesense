# ADR 0067: Add The Rhythm And Timing Engine

## Status

Accepted

## Context

NoteSense could tell a learner _which_ note to play but nothing about _when_. Rhythm is half of reading, and everything still to come — a Reading Score with a rhythmic component, real-piano MIDI performance, singing onsets, and imported repertoire — needs the same answer to one question: how do you compare a performance against a notated timing?

Getting that comparison wrong is easy in two specific ways. Using wall-clock time makes a metronome drift and then blames the learner for the drift. And collapsing the result into a single percentage hides the distinction that matters most: a learner who is steadily 90ms early has a latency or anticipation problem, while a learner scattered around the beat has a pulse problem, and the two need opposite advice.

## Decision

Add a framework-free rhythm engine under `shared/src/rhythm/`, built on the Slice 1 musical domain.

`pattern.ts` generates patterns from **rhythmic cells** rather than loose note values. Every cell spans a whole number of quarter notes, which is both how rhythm is actually read — a triplet is a group of three in the space of a beat, not three independent thirds — and what guarantees a bar fills exactly. Choosing loose values let a bar strand an unfillable remainder such as a sixth of a beat; that was a real defect caught by a test asserting bars sum to their meter. Patterns are authored in rational time and compiled to integer ticks, so a triplet in a rhythm drill and a triplet in notation mean the same thing.

`grade.ts` is the one place the two timebases meet, and it keeps them explicit:

- **Expected** onsets are musical time: integer ticks, authored and invariant.
- **Played** onsets are performed time: audio-clock seconds, measured and device-dependent.
- Grading projects expected ticks onto seconds at the round's tempo, subtracts measured input latency from the played onsets, and matches the two greedily, never matching one tap to two onsets.

Tolerance is a quarter of a beat, clamped to 60–200ms, so the window stays musically meaningful at slow tempi and humanly possible at fast ones rather than being a fixed millisecond figure that means different things at different speeds.

The result is reported as **separate components** — onsets in time, pulse steadiness, mean signed error, completion, and extra taps — with a plain-language reading that names a systematic offset before anything else. Completion is tracked apart from accuracy because stopping halfway is a different problem from playing badly.

On the app side, `metronome.ts` schedules clicks ahead on the audio clock rather than firing them from a timer, because `setInterval` drifts under load, and the same clock stamps the taps, so a tap and a click are directly comparable. Count-in beats are excluded from the performance: the clock's zero is the first beat after the count-in. `useRhythmSession` runs the round and `RhythmWorkspace` is a new `/practice/rhythm` destination.

## Consequences

- Rhythm drills, and later Reading Score, MIDI, and singing, share one timing model instead of each inventing a comparison.
- Triplets, dotted values, and compound meter are exact rather than approximated, because rational time compiles to whole ticks at PPQ 960.
- Feedback tells a learner which problem they have rather than only how badly they did.
- A device with no audio still runs a round silently rather than crashing, though without a metronome to play against.
- Latency calibration is not yet measured; `latencyMs` is a parameter the grader honours and a future MIDI or audio calibration step will supply.
- Changes to the tolerance policy, the cell vocabularies, or the score components require product, data-contract, and testing review.

# ADR 0070: Ear Training And Staff Transcription

## Status

Accepted

## Context

Pitch training today asks the learner to name or reproduce one note at a time. That is a start, but it is not
ear training: hearing music means hearing distance, quality, direction, and shape, and then being able to write
some of it down. The roadmap names nine families for this slice and one editor, and puts them after the rhythm
engine so a heard rhythm can be graded against real timing rather than a placeholder.

The trap in every one of these families is feedback that is technically a number and practically useless. A
learner who mis-hears one note in a ten-note phrase needs to be told which note; a total tells them nothing
they can act on, and a badly built comparison will tell them something worse than nothing.

## Decision

`shared/src/ear/` holds the model, framework-free, and nine generators register through the existing
`ExerciseDefinition` platform rather than beside it.

**Comparison is by alignment, not by index.** This is the load-bearing decision. Comparing a written-down
sequence to the source position by position is wrong in the case that matters most: miss one note in the middle
and every note after it shifts, so a learner who heard nine of ten correctly is told they got one right. That
feedback is not merely harsh, it is false, and it points them at the wrong thing to fix. `sequence.ts` aligns
the two by edit distance, with a substitution priced below a delete-plus-insert so a wrong note is reported as
a wrong note rather than as a note missed and a note invented — the same edit distance, very different advice.
The result names the position and the kind of error, which is what makes "correct a specific transcription
error" possible at all.

**Theory is a table, not branching code.** A generator picks a row and the answer screen renders the same row's
label, so the thing being asked and the thing being shown cannot drift — the usual way an ear exercise ends up
marking a right answer wrong. Options offered are the whole family; hiding the harder ones would raise scores
without teaching anything, and learners notice.

**Transcription is musical time on both sides.** The learner is notating a phrase, not performing it, so an
entered note either sits on the written beat or it does not. There is no tolerance band, and applying one would
forgive a rhythm that was written wrong. Performed time, with its tolerance and latency correction, stays in
the rhythm engine, which is where the rhythm echo family sends its taps.

**Replay limits exist to keep listening exercises about listening**, not to make them harder. Learn mode has
none — there is nothing to protect while someone is still building the skill. Practice allows three. A test
plays once and refuses a replay after entry has begun, because replaying mid-answer measures something other
than what the learner held. The remaining count is always stated: a limit the learner cannot see reads as a bug.

**The editor is slot-then-pitch.** Pick where the note goes, then play it. Dragging note heads would look
better and would be unusable on a phone and with a keyboard, which is most of the people this exercise serves.
Every position is a button; with one selected, the arrow keys move the note by semitone or by beat and Delete
removes it. Editor history is a single piece of state and the selection is held as an onset rather than an
index — an index into a sorted list stops meaning the same note the moment anything moves, and split history
state loses an edit when two notes are entered in the same tick.

**Generated sequences are called note sequences, never melodies.** They are drawn from a scale, not composed.
Calling them melodies would train a learner to listen for a shape that is not there. A test asserts no
generator title says otherwise.

The stimulus/answer validation rule was scoped rather than removed: the audio must equal the expected answer
**when the learner is asked to reproduce it**, which is what catches a generator playing one thing and marking
another. When the answer is a name, a written phrase, or a note deliberately left out — finding the key centre
plays everything except the tonic — there is nothing to compare, and demanding a match would forbid the family.

Ear attempts reach the evidence ledger through the same `createLiveAttemptEvent` path as reading, so the exit
gate holds because there is only one way in.

## Consequences

- Nine families ship: interval, chord quality, scale/mode, cadence, interval reproduction, note sequences, key
  centre, rhythm echo, and pitch-and-rhythm transcription.
- Feedback names the note and the kind of error, so a learner can fix a specific mistake.
- Ear exercises produce the same evidence and projections as reading.
- Key-change detection is not built; the roadmap defers it, and it stays deferred.
- The transcription editor writes onto the phrase's own onsets rather than a free grid, so a learner cannot yet
  write a rhythm the source did not have. Free rhythmic entry needs a duration palette and is not in this slice.
- The rhythm echo is graded at a fixed tempo, so the tapped answer and the phrase share one grid.
- Playback is synthesized from the app's own oscillators, so no audio is licensed, downloaded, or fetched.

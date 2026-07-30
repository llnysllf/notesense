# ADR 0066: Add The Sight-Reading Academy

## Status

Accepted

## Context

Note reading was a single drill. It adapted to the learner, revealed answers, and let them pick a range, which is right for practice but wrong for everything else. There was no way to work through material with help, and no way to measure reading without the app quietly assisting: a score produced by a drill that chases your weak notes and shows you every answer measures neither reading nor progress.

Feedback was also thin. A wrong answer produced "It was C4" and nothing more, so a learner could miss the same note twenty times without ever being told that they keep landing an octave out.

## Decision

Turn reading into a path with four ways to work, defined as data in `shared/src/reading/`:

- **Learn** — guided, with hints available, no adaptive chasing. The next note is shown faintly to support continuous reading.
- **Practice** — adaptive drilling that returns to weak notes; the existing behavior.
- **Test** — a fixed, unseen set with no hints, no answers revealed, and no adaptive selection. Prompts remain visible: the test measures reading rather than recall after a timed preview.
- **Custom** — the learner's own range and length.

The rules live in one table rather than as conditionals spread across screens, because the Practice/Test boundary is the part that is easy to erode. A test that adapts mid-run, reveals answers, or lets the learner narrow the range is no longer measuring reading, so each of those is a declared property and each is asserted by a test. Test items also do not contribute practice evidence, so a score cannot be inflated by having just drilled the same notes.

Two supporting pieces:

- `mistakes.ts` gives misses a taxonomy — wrong octave, semitone slip, step slip, third slip, distant — described in pitch terms, because that is what a reader can act on. Misses are grouped by _the note that was on the staff_ rather than by the wrong answer, which is what makes the result actionable: it names the notes to look at again. `MistakeReplay` shows that after a round and offers a corrective round, and renders nothing at all after a clean one.
- `testForm.ts` builds a test from a seed against a fixed spec, so a form is unseen, reproducible, and comparable between sittings, and scores it with a median response time so one interruption does not define the result.

`readingMode` joins `PracticeSettings` (normalized, persisted) and changing it restarts the round, since prompts are chosen differently under each mode. The mode buttons carry an explicit accessible name (`"Custom mode"`) because "Custom" also names a range preset, and two identically-named buttons in one view is ambiguous for assistive technology and voice control.

## Consequences

- Reading supports Learn, Practice, Test, and Custom, and all four produce the same shared attempt evidence.
- The Practice/Test distinction is enforced by data and tests rather than by remembering it on every screen.
- A wrong answer can now say something a learner can use, and repeated misses surface as a short corrective set rather than accumulating silently.
- Test forms are reproducible from a seed, which is what a future calibrated Reading Score will need; this slice deliberately does not claim to be that score.
- Look-ahead is a Learn-only aid. Audiation is not part of the assessment flow; adding it requires an explicit product decision and an accessibility review.
- Changes to the mode rules, the mistake taxonomy, or the test-form contract require product, data-contract, and testing review.

# ADR 0065: Add Today And The Daily Plan

## Status

Accepted

## Context

NoteSense opened straight onto a drill. A returning learner had to decide what to practise before they could practise anything, and nothing in the app said what would help most today or when they had done enough. Deciding is the part learners skip, and an app with no end point turns practice into an open-ended feed rather than a habit that can be finished.

The earlier prototype of this idea generated a "daily mix" from note-level counters and carried its own notion of what was weak. That would have been a second, private scoring system sitting beside the evidence ledger, drifting from it as the real engine improved.

## Decision

Add a **Today** screen backed by a **daily plan**, and make it the app home.

The planner lives in `shared/src/plan/` and is a pure consumer of existing contracts. It reads a mastery snapshot from the evidence ledger and ranks competencies with the ledger's own scheduler, so the reason shown next to a block is the scheduler's explanation rather than a story the plan invented. It has no scoring or mastery logic of its own.

Planning rules, all covered by tests:

- Deterministic for a learner and a **local** calendar date, so the plan is stable through the day, matches across devices, and rolls over at the learner's midnight rather than at UTC midnight.
- Regenerated when the day, the planner version, or the curriculum version changes; a stored plan from an older planner is regenerated rather than reinterpreted.
- Never plans an activity that does not ship, so a block never leads to an empty screen.
- Never exceeds the time the learner has, and never fills the plan with a single activity.
- Always offers something, including to a learner with no evidence at all.

Completion is earned, not claimed. Opening a block records it as _active_; the block is credited only when its own activity actually reports completion, and finishing a different activity does not credit it. Marking is idempotent, so returning to Today cannot double-count. This is the difference between a progress indicator that means something and one that rewards clicking.

Today is added to the route model as `/today` and becomes the default destination. The topbar's session status and replay control are now shown only on a practice screen, because they did nothing on Today, Progress, or Settings.

The plan is stored under `notesense.dailyPlan.v1` and normalized as untrusted input. It is a cache, not a record of learning: if it is missing or malformed it is regenerated, and losing it costs no progress, because the evidence ledger holds what was actually practised.

## Consequences

- A returning learner has a finite, explained plan instead of a blank decision, and a real end point for the day.
- Every block states why it was chosen, using the scheduler's own reasoning, so the plan is auditable rather than a black box.
- Today has no private mastery model, so improvements to the evidence engine improve the plan automatically and the two cannot drift.
- Today progress reflects practice that actually happened.
- The plan is a derived cache; the durable learning record remains the evidence ledger.
- Changes to the planning rules, the plan shape, or the completion semantics require data-contract, product, and testing review.

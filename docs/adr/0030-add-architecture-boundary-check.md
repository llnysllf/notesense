# ADR 0030: Add Architecture Boundary Check

## Status

Accepted

## Context

NoteSense has clear written architecture boundaries: shared data contracts stay framework-agnostic, practice logic stays pure, storage owns persistence, hooks own React orchestration, and components stay focused on presentation. Those boundaries make the current local-first app easier to test and keep the future backend path safer.

As the app grows, import drift is easy to miss in review. A component could start writing storage directly, shared code could gain a browser dependency, or practice logic could start depending on React. Those changes would make future account, sync, and backend work harder.

## Decision

Add `npm run architecture:check`, backed by `scripts/check-architecture-boundaries.mjs`, and include it in `npm run check`.

The check verifies:

- production shared modules import only local shared modules and avoid browser globals
- `src/practiceEngine.ts` and `src/noteData.ts` stay framework-independent and avoid storage, audio, hooks, components, app-shell, and browser-global dependencies
- `src/storage.ts` does not depend on React, UI components, hooks, audio, or the app shell
- UI components do not import storage, hooks, audio, the app shell, or direct persistence/network/audio side effects
- hooks do not import presentation components
- app-facing imports of `@notesense/shared` stay routed through `src/types.ts` or `src/storage.ts`

## Consequences

- Architectural seams are enforced locally and in CI instead of relying only on reviewer memory.
- Future features can still change the boundaries, but those changes must update the checker, architecture docs, and this decision intentionally.
- The check is intentionally source-level and lightweight; it complements TypeScript, tests, and docs rather than replacing deeper review.

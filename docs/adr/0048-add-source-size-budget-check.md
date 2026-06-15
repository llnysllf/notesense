# ADR 0048: Add Source Size Budget Check

## Status

Accepted

## Context

NoteSense has strong import-boundary checks, but future feature work can still make the base harder to extend by growing the app shell, hooks, components, core modules, or shared contracts into catch-all files. That kind of drift usually happens gradually and can pass normal tests while making later refactors slower and riskier.

The current codebase is still below practical size limits. This is the right moment to add a lightweight tripwire before growth becomes painful.

## Decision

Extend `npm run architecture:check` so `scripts/check-architecture-boundaries.mjs` also enforces source-size budgets for production TypeScript modules:

- `src/App.tsx` stays at or below 320 lines.
- core practice and storage modules stay at or below 600 lines.
- hooks stay at or below 320 lines each.
- UI components stay at or below 260 lines each.
- shared contract modules stay at or below 300 lines each.

Crossing a budget should trigger one of two deliberate actions: split responsibilities into a clearer module, or update the budget with documentation and review evidence.

## Consequences

- Future features get an earlier signal when a module is becoming too broad.
- Reviewers can ask for structural cleanup before large files become project gravity.
- The budgets are intentionally coarse. They do not measure design quality by themselves, but they make maintainability drift visible in CI.

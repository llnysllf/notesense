# ADR 0011: Harden TypeScript Compiler Contract

## Status

Accepted

## Context

NoteSense already uses TypeScript `strict`, but the project is expected to grow toward account data, cloud sync, and service boundaries. In that future shape, optional values, array lookups, and inherited class behavior become common sources of quiet defects.

The codebase also has enough tests and CI coverage now that it is worth tightening the compiler contract before more features are added.

## Decision

Enable additional TypeScript hardening flags for app and tooling code:

- `exactOptionalPropertyTypes`
- `noUncheckedIndexedAccess`
- `noImplicitOverride`
- `noUnusedLocals`
- `noUnusedParameters`

Keep those flags in both `tsconfig.json` and `tsconfig.node.json`.

Update the existing code to satisfy the stricter contract by:

- Omitting optional properties when no value exists.
- Proving array and record lookups with fallbacks.
- Marking React class overrides explicitly.
- Avoiding direct test fixture indexing without a guard.

## Consequences

- Future refactors must handle missing values explicitly.
- Accidental unused code fails during `npm run typecheck`.
- The app is better prepared for future backend, sync, and account data shapes.
- Some test fixture code is slightly more explicit, but that explicitness mirrors production expectations.

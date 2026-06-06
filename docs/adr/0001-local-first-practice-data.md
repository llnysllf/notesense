# ADR 0001: Keep Practice Data Local-First

## Status

Accepted

## Context

NoteSense is a beginner piano practice tool. The current app runs as a static GitHub Pages site and stores progress, settings, and session history in the learner's browser. Future versions may add sign-in, cloud sync, or a managed backend, but the practice loop should remain fast, private, and usable without an account.

## Decision

Keep the product local-first until cross-device sync or account-backed learning history becomes necessary.

The current data boundary is:

- Browser storage for progress, settings, and practice history.
- Versioned JSON import/export for portability.
- Pure TypeScript normalization and migration logic.
- No required network calls in the practice loop.

Future backend work should preserve a migration path from anonymous local data into an authenticated profile.

## Consequences

- Learners can use the app without sign-in or server availability.
- Privacy risk stays low while the project is static.
- Import/export and migration logic are product-critical and must remain tested.
- Future cloud features need explicit architecture work instead of being mixed into UI components.

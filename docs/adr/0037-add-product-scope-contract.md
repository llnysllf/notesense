# ADR 0037: Add Product Scope Contract

## Status

Accepted

## Context

NoteSense is intentionally small while its foundation is being strengthened. The README describes current scope and non-goals, and several docs say future account, sync, backend, analytics, MIDI, or expanded music-theory work needs explicit design.

The missing control is a product-scope contract that keeps the supported learner surface, explicit non-goals, and feature-intake expectations visible. Without it, the project could add features before the base is ready, or drift into a larger product without updating privacy, data, accessibility, testing, release, operations, and backend-readiness expectations.

## Decision

Add `docs/PRODUCT_SCOPE.md` and `npm run product:check`, backed by `scripts/check-product-scope.mjs`. Include the check in `npm run check`.

The check verifies:

- product-scope docs keep product promise, current supported scope, explicit non-goals, foundation-first rule, feature-intake, change-rule, and verification sections
- README current scope keeps the supported surface and explicit non-goals visible
- contributor guidance and PR review keep product-scope impact visible
- architecture, quality, release, backend-readiness, threat-model, data, privacy, accessibility, testing, operations, and ADR docs stay connected to the current product boundary

## Consequences

- The project has an explicit guardrail against feature creep while foundation work continues.
- Future product-scope changes must update the product contract and adjacent governance docs intentionally.
- Foundation-only work remains valid when it strengthens evolvability without expanding the learner-facing surface.

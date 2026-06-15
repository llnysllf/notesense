# ADR 0047: Add Product Learning And Feedback Contract

## Status

Accepted

## Context

NoteSense has strong engineering hygiene, product-scope guidance, review intake, observability rules, incident learning, release safety, and operations docs. The remaining big-company gap is not another app feature; it is the product feedback loop that explains how the project should learn from real usage, evaluate future features, and introduce analytics or experiments without breaking the local-first privacy promise.

Analytics, feature flags, A/B tests, surveys, support queues, and DORA metrics can be valuable once real users depend on the product. They can also create privacy, legal, runtime, release, and operational risk if added casually.

## Decision

Add `docs/PRODUCT_LEARNING.md` and `npm run product:learning`, backed by `scripts/check-product-learning-contract.mjs`. Include the check in `npm run check`.

The contract defines:

- the current no-analytics learning boundary
- acceptable current feedback and decision inputs
- required review before future analytics, experiments, surveys, feature flags, session replay, or support tooling
- denied data for product-learning signals
- when DORA-style delivery metrics become meaningful
- adjacent docs that must move together when product-learning expectations change

## Consequences

- Product feedback becomes a maintained foundation contract rather than an implicit hope.
- Future analytics or experiment work must update privacy, security, legal, observability, release, operations, runtime-surface, data, product-scope, and ADR guidance intentionally.
- The project can keep building foundation quality without adding user-facing features before the base is ready.

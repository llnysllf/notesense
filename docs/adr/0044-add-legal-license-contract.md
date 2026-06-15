# ADR 0044: Add Legal And License Contract

## Status

Accepted

## Context

NoteSense has dependency license checks, security gates, release guidance, repository governance, and operations documentation, but the project itself did not have an explicit root license file. A public repository without clear terms leaves reviewers, future contributors, and the owner guessing whether the code is open source, portfolio-only, or otherwise restricted.

The safest foundation-first default is to make the current permission boundary explicit without granting open-source rights accidentally.

## Decision

Add a root `LICENSE` file with all-rights-reserved project terms and mark package metadata with `license: "UNLICENSED"` while the package remains private.

Add `docs/LEGAL.md` and `npm run legal:check`, backed by `scripts/check-legal-contract.mjs`. Include the check in `npm run check`.

The legal contract covers:

- project license source of truth
- package metadata expectations
- user-facing legal triggers for future hosted services, telemetry, accounts, payments, support, or external contributors
- separation between dependency license compliance and the project's own license
- review, release, ADR, and PR guidance for legal changes

## Consequences

- The repository no longer relies on implicit copyright defaults.
- Future open-source licensing is still possible, but it must be an intentional owner-approved change.
- User-facing legal and contributor-community expectations become visible before production usage, telemetry, accounts, or external contribution workflows are added.
- The check stays lightweight and complements dependency license compliance, security/privacy checks, release guidance, and human review instead of replacing legal judgment.

# ADR 0038: Add Review And Intake Contract

## Status

Accepted

## Context

NoteSense already has CODEOWNERS, structured issue templates, a pull request template, repository governance checks, release guidance, security policy, and contribution guidance. Those pieces make review and planning more professional, but their relationship was implicit.

The missing control is a review and intake contract that explains how bugs, product proposals, engineering tasks, security reports, ownership, and pull-request evidence should flow through the project.

Without this control, future changes could weaken issue templates, remove review evidence prompts, change ownership routing, or blur feature intake while still passing code-focused checks.

## Decision

Add `docs/REVIEW_PROCESS.md` and `npm run review:check`, backed by `scripts/check-review-process.mjs`. Include the check in `npm run check`.

The check verifies:

- CODEOWNERS keeps default review ownership
- bug, product proposal, and engineering task templates keep labels and required evidence fields
- blank public issues stay disabled and security reports route through the security policy
- the pull request template keeps summary, quality checklist, risk notes, validation, and foundation-impact prompts
- README, contributing, quality, release, architecture, operations, product-scope, testing, security, and ADR docs stay connected to review and intake governance

## Consequences

- Human review paths become part of the maintained foundation rather than informal repository settings.
- Future review, triage, template, ownership, or security-report routing changes must update docs and checks intentionally.
- The check stays lightweight and text-based; it complements repository branch-protection governance rather than replacing it.

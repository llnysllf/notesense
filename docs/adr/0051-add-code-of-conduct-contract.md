# ADR 0051: Add Code Of Conduct Contract

## Status

Accepted

## Context

NoteSense already has a clear license boundary, security policy, contributing guide, pull request template, issue templates, CODEOWNERS, and review contracts. The remaining community-health gap is that repository participation expectations are implied across legal and contributing docs instead of stated in a root policy.

A public, portfolio-oriented repository can still receive issues, pull requests, and review comments. A foundation-first project should define respectful participation, private reporting paths, and enforcement boundaries before a difficult interaction forces those decisions under pressure.

## Decision

Add a root `CODE_OF_CONDUCT.md` covering:

- participation standard
- unacceptable behavior
- reporting path for public and private concerns
- enforcement authority
- repository scope
- change rules for legal and documentation alignment

Extend `docs/LEGAL.md`, `CONTRIBUTING.md`, the pull request template, README, changelog, repository hygiene, policy-docs checks, and `npm run legal:check` so the conduct policy is treated as part of the legal/community foundation instead of an optional markdown file.

## Consequences

- Repository participation expectations are explicit before NoteSense grows into a larger contributor community.
- Conduct reporting stays aligned with security and privacy reporting when private information or safety risk is involved.
- The Code of Conduct does not change the all-rights-reserved project license, grant contribution rights, or create a support commitment.
- Future changes to contributor-community or moderation expectations must update docs and checks intentionally.

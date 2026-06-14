# ADR 0039: Add Dependency Maintenance Contract

## Status

Accepted

## Context

NoteSense already has Dependabot, Dependency Review, npm audit, lockfile supply-chain checks, license compliance checks, GitHub Actions workflow policy checks, CodeQL, and release guidance. Those controls protect important pieces of dependency risk, but the maintenance policy is spread across several documents and scripts.

Dependency changes can affect security, browser compatibility, bundle size, licensing, workflow permissions, and release confidence even when they do not change product behavior.

Without an explicit dependency maintenance contract, routine updates, major upgrades, runtime changes, and workflow action updates could drift from the reviewed supply-chain posture while still looking like normal maintenance.

## Decision

Add `docs/DEPENDENCY_MAINTENANCE.md` and `npm run dependencies:check`, backed by `scripts/check-dependency-maintenance.mjs`. Include the check in `npm run check`.

The check verifies:

- Dependabot cadence, grouping, open-PR limits, and npm major-upgrade policy
- package scripts for dependency maintenance, supply-chain, lockfile, license, audit, workflow, and release gates
- README, contributing, security, quality, release, architecture, testing, ADR, changelog, and PR review guidance stay connected to dependency maintenance

## Consequences

- Dependency maintenance becomes a first-class foundation contract rather than scattered release guidance.
- Routine updates stay lightweight, while major upgrades and runtime changes remain intentional engineering work.
- The check stays text-based and complements existing supply-chain checks instead of replacing audit, lockfile, license, workflow, Dependency Review, or CodeQL gates.

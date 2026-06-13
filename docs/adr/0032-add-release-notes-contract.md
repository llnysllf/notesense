# ADR 0032: Add Release Notes Contract

## Status

Accepted

## Context

NoteSense already has a changelog, semantic versioning language, release guidance, and strong CI evidence. The missing release-discipline control is an automated check that keeps `CHANGELOG.md` aligned with `package.json` and preserves a reviewable Unreleased section.

Without a check, a release can pass every technical gate while leaving the human-facing release history stale. That weakens auditability for reviewers, future maintainers, and portfolio readers.

## Decision

Add `npm run release:notes`, backed by `scripts/check-release-notes.mjs`, and include it in `npm run check`.

The check verifies:

- `CHANGELOG.md` starts with the expected changelog heading
- the changelog cites Keep a Changelog and semantic versioning
- `[Unreleased]` exists as the first release section
- `package.json` version has a matching released changelog section
- released headings use semantic versions, ISO dates, and newest-to-oldest order
- changelog categories stay inside the Keep a Changelog section set
- `[Unreleased]` includes at least one category and bullet

## Consequences

- Release notes become part of the normal quality gate.
- Version changes must keep `CHANGELOG.md` aligned with `package.json`.
- Pending work stays visible in `[Unreleased]` until a release cuts it into a dated version section.

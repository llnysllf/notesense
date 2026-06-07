# ADR 0015: Add Documentation Integrity Gate

## Status

Accepted

## Context

NoteSense now has product documentation, policy documentation, release guidance, ADRs, and contributor guidance. As the project grows, file paths, headings, and package scripts can change while old documentation continues to look correct at a glance.

A big-company-quality repo should make documentation drift visible in CI. Broken internal links, stale anchors, and missing documented commands create friction for reviewers, future contributors, and the portfolio audience.

## Decision

Add `npm run docs:integrity` through `scripts/check-doc-integrity.mjs`.

The check scans project Markdown files outside generated folders and validates:

- local Markdown links resolve to existing files
- Markdown anchor fragments resolve to headings
- external HTTP links are rejected in favor of HTTPS
- documented `npm run ...` commands exist in `package.json`
- documented `npm test` resolves to the `test` script

Keep `npm run docs:check` as the single documentation gate by running both:

- `npm run docs:policy`
- `npm run docs:integrity`

## Consequences

- Documentation drift becomes a CI-visible failure instead of a reader-discovered problem.
- Future docs, script, heading, and file-path changes must keep references synchronized.
- The check stays dependency-free so it can run anywhere the existing Node runtime runs.

# ADR 0036: Add ADR Governance Check

## Status

Accepted

## Context

NoteSense now has many Architecture Decision Records covering product boundaries, quality gates, data contracts, release discipline, operations, accessibility, and testing. Those records are valuable only if future maintainers can find them, trust their numbering, and understand their status.

The missing control is ADR governance: an index plus an automated check that keeps ADR filenames, headings, statuses, required sections, and index links aligned.

Without this control, a future decision can be added with a duplicate number, a missing status, a broken link, or no index entry while still looking acceptable in a normal code review.

## Decision

Add `docs/adr/README.md` and `npm run adr:check`, backed by `scripts/check-adr-contracts.mjs`. Include the check in `npm run check`.

The check verifies:

- ADR filenames use the `NNNN-short-title.md` pattern
- ADR numbers are unique and sequential from `0001`
- headings match the ADR number and title
- each ADR has `## Status`, `## Context`, `## Decision`, and `## Consequences`
- statuses use the reviewed set: `Proposed`, `Accepted`, `Deprecated`, or `Superseded`
- the ADR index links every ADR with matching title and status

## Consequences

- Architecture decisions become easier to browse and audit as the project grows.
- Future ADR additions, removals, renames, or status changes must update the index intentionally.
- The check stays lightweight and file-based; it complements, but does not replace, thoughtful decision writing.

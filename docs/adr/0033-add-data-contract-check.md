# ADR 0033: Add Data Contract Check

## Status

Accepted

## Context

NoteSense is local-first today, but its stored progress, settings, import/export shape, and future sync path are already product contracts. Privacy docs, the threat model, shared TypeScript types, storage code, and browser tests all describe pieces of that contract.

The missing control is an automated check that keeps those pieces aligned. Without it, a storage key or export schema could change while privacy docs, backend-readiness assumptions, or import/export coverage quietly drift.

## Decision

Add `docs/DATA_CONTRACT.md` and `npm run data:check`, backed by `scripts/check-data-contracts.mjs`. Include the check in `npm run check`.

The check verifies:

- LocalStorage keys in `src/storage.ts` stay documented
- shared export schema constants and TypeScript fields remain present
- privacy, architecture, threat-model, and release docs describe the current data boundary
- browser tests continue to cover export, import, invalid import, and storage-failure behavior

## Consequences

- Data and privacy expectations become enforceable before accounts or sync exist.
- Future storage-key, export-schema, import-normalization, analytics, network, account, or sync changes must update docs and tests intentionally.
- The check stays lightweight and source-based; deeper migration or sync tests should still be added when backend work begins.

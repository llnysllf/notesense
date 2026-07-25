# Data Contract

NoteSense is local-first today. This contract names the browser storage keys, export shape, normalization rules, and future sync constraints that must stay explicit as the product grows.

Product-learning and feedback expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).
Exercise schema and generator expectations live in [CONTENT_CONTRACT.md](CONTENT_CONTRACT.md).

## Score Validation

The shared score model is untrusted-input data. It caps a score at 4 parts, 400 measures per part, 4 voices per
measure, 128 events per voice, and 8 pitches per note; titles are capped at 120 characters. Import callers use
`normalizeScoreWithWarnings` so any dropped or capped musical material is surfaced to the learner rather than
silently corrupted. The legacy `Song` compatibility adapter rejects scores it cannot reproduce exactly.

## Current Storage Keys

The browser app owns these LocalStorage keys through `src/storage.ts`:

- `notesense.progress.v2`: current practice progress, note stats, pitch stats, and capped session history.
- `notesense.settings.v3`: current practice settings.
- `notesense.songProgress.v1`: per-song sheet-reading results (best accuracy, completion count, last played time); no imported file contents and no note-by-note answer history.
- `notesense.progress.v1`: legacy progress key that may be read and normalized during migration.

No other browser storage key is part of the supported app contract.

## Export Schema

Exported JSON is created only through a learner action. The current export schema version is `1` and includes:

- `schemaVersion`
- `exportedAt`
- `progress`
- `settings`

The export filename follows `notesense-progress-YYYY-MM-DD.json`.

## Progress Shape

Progress contains:

- `reading` mode totals, best round score, completed sessions, and note stats.
- `pitch` mode totals, best round score, completed sessions, and note stats.
- `history`, capped by `SESSION_HISTORY_LIMIT`.

Session history records include `id`, `mode`, `completedAt`, `durationSeconds`, `score`, `attempts`, `accuracy`, and `bestStreak`.

## Settings Shape

Settings include:

- `roundLength`
- `readingRange`
- `customReadingRange`
- `adaptivePractice`
- `autoPlayPitch`
- `revealPitchAfterAnswer`

Settings are normalized through shared data-contract code before they are used.

## Import Rules

Imported files are untrusted input:

- JSON parsing failures return the invalid-import message.
- Unsupported `schemaVersion` values are rejected.
- Progress counters are clamped to safe whole numbers.
- Session history is normalized, sorted newest first, and capped by `SESSION_HISTORY_LIMIT`.
- Settings fall back to defaults when imported values are missing or unsupported.

## Privacy Boundary

- Practice data stays in the current browser profile unless the learner exports it.
- The service worker caches static app assets only; it must not cache practice progress, exported files, or imported files.
- No analytics, telemetry, cookies, beacons, websockets, or background sync are part of the current data contract.
- Future account, sync, analytics, API, or hosted-storage work must update this contract, privacy docs, threat model, backend readiness, runtime-surface checks, and release guidance together.
- Future product analytics, experiments, surveys, support tooling, or remote feature flags must not collect practice answers, note-level progress, session history, imported/exported JSON contents, raw LocalStorage, audio recordings, keystrokes, precise location, or stable cross-site identifiers without a new product, privacy, legal, security, and data-contract decision.
- Future localization must keep exported data identifiers stable and presentation-only labels separate from stored practice IDs.

## Verification

`npm run data:check` verifies that:

- storage keys in `src/storage.ts` are documented
- shared export schema constants and TypeScript fields remain present
- privacy, architecture, and threat-model docs describe the current data boundary
- browser tests still cover export, import, invalid import, and storage-failure behavior

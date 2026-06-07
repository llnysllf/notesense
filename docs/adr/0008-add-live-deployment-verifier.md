# ADR 0008: Add Live Deployment Verifier

## Status

Accepted

## Context

NoteSense deploys from `main` to GitHub Pages. CI, bundle budgets, and Pages preview smoke tests prove the source and build output before release, but a release is not fully proven until the public GitHub Pages URL responds with the expected app shell and asset paths.

Manual `curl` checks are useful, but they are easy to skip or perform inconsistently.

## Decision

Add a live deployment verifier:

- `npm run deploy:verify-live` checks the public GitHub Pages URL.
- The script verifies HTTP 200 responses, HTML content type, the NoteSense title, the React root, `/notesense/assets/` references, and successful asset responses.
- The default target is `https://llnysllf.github.io/notesense/`.
- A different URL can be passed as an argument or through `NOTESENSE_LIVE_URL`.

The check is intentionally not part of `npm run verify` because it depends on public network access and the current deployed environment.

## Consequences

- Post-deploy verification becomes repeatable and auditable.
- The release guide can point to one command instead of several manual checks.
- CI remains deterministic and does not depend on the live production URL.
- Future hosting or domain changes have a clear script and ADR to update.

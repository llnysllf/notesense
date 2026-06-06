# NoteSense Architecture

NoteSense is currently a local-first React application. The product goal is to keep the practice loop fast and polished while preserving clean seams for future sign-in, cloud storage, sync, and managed web services.

## Current Shape

- `src/practiceEngine.ts` owns scoring, adaptive weighting, daily goals, session summaries, trend summaries, mastery states, practice-plan recommendations, and analytics helpers. It is pure TypeScript and does not depend on React or browser storage.
- `src/noteData.ts` owns structured note ranges for treble reading, bass reading, and pitch training.
- `src/storage.ts` owns persistence, normalization, migration from the original local progress shape, and versioned data import/export.
- `src/audio.ts` owns browser audio playback.
- `src/components` contains focused UI sections for the staff, pitch prompt, stats panel, session history, practice insights, and stat tiles.
- `src/App.tsx` coordinates product state, round flow, settings, storage calls, and component composition.
- `e2e/app.spec.ts` covers the browser practice loop, accessibility, layout health, insight chart rendering, import/export behavior, and storage failure messaging.
- `e2e/pages-smoke.spec.ts` covers the GitHub Pages build at the `/notesense/` base path.
- `.github/workflows` owns the CI, CodeQL, and Pages deployment gates.
- `docs/adr` records architecture decisions that should survive beyond a single implementation pass.
- `.nvmrc`, package engines, and `.npmrc` define the shared Node/npm runtime for local development, CI, deployment, and dependency maintenance.
- `scripts/check-licenses.mjs` owns dependency license policy enforcement.
- `scripts/check-bundle-budget.mjs` owns the static Pages bundle budget.
- `scripts/serve-pages-preview.mjs` serves `dist` under `/notesense/` for deployment-shape smoke tests.

## Quality Bar

Every feature should keep these expectations intact:

- Practice logic remains testable outside React.
- New note ranges should be added as data first, then wired through tested selection and settings paths.
- Product analytics and chart inputs are derived in pure functions before rendering.
- Habit analytics are derived from completed sessions so future sync can reconcile daily goals from server history.
- Mastery state remains range-aware so treble, bass, pitch, and future expanded ranges do not leak progress into each other.
- Coaching recommendations stay derived and deterministic until there is a service layer that can own personalization.
- Persistence changes go through a storage boundary instead of being scattered through UI components.
- User-visible state has a failure path, especially for save, export, auth, and sync operations.
- Accessibility is part of the feature definition, not a final cleanup step.
- Dependency license compliance is part of supply-chain readiness.
- Security scanning is part of release readiness, especially for dependency, import/export, auth, sync, and backend-boundary changes.
- Performance budgets are part of release readiness so the practice app stays fast as scope grows.
- Deployment base-path smoke coverage is part of release readiness because GitHub Pages serves the app from `/notesense/`.
- The full `npm run check` gate must pass before a change is considered ready.
- The full `npm run verify` release gate must pass before a change is shipped.
- The GitHub Pages build must be verified with the `/notesense/` base path before deployment.
- Runtime upgrades should be intentional engineering changes, not incidental workflow edits.
- Pull requests should use the quality checklist in [docs/QUALITY.md](QUALITY.md).

## Local-First Data Model

The app saves progress and settings in browser LocalStorage today. This keeps version 1 useful without accounts or infrastructure, and it gives us a simple offline baseline. Exported data includes:

- `schemaVersion`
- `exportedAt`
- `progress`
- `settings`, including selected reading range

That import/export schema is the first contract for future account migration. When sign-in arrives, imported local data can be uploaded to a user profile without relying on fragile DOM or browser-state scraping.

## Future Cloud-Ready Path

The likely service-backed version should introduce these pieces in order:

1. Authentication: add email, passkey, or OAuth sign-in with a provider such as Cognito, Auth0, Clerk, or Supabase Auth.
2. API boundary: create a small backend service for profile, practice session, settings, and sync endpoints.
3. Managed persistence: store user profiles, settings, and practice sessions in a database such as Postgres or DynamoDB.
4. Sync model: keep local progress as the fast source during practice, then sync completed sessions and settings after each round.
5. Migration: use the versioned local data import path for anonymous users who later create an account.
6. Observability: add structured server logs, request tracing, and client-side error reporting.
7. Release safety: use feature flags or staged rollout for account and sync features.

An AWS version could use Cognito, API Gateway, Lambda, DynamoDB or RDS, S3, CloudFront, and CloudWatch. That choice should happen when the backend feature set is clearer, not before the local product proves the learning loop.

## Boundaries To Preserve

- Keep `practiceEngine` framework-independent.
- Keep browser storage behind adapter-style functions.
- Keep export/import schemas versioned.
- Keep network calls outside the core practice engine.
- Keep UI components focused on one product responsibility.
- Keep browser tests tied to real user workflows rather than implementation details.
- Keep repository operations, dependency updates, and release checks documented rather than tribal.
- Keep license policy changes explicit and reviewed when dependencies change.
- Keep runtime version changes aligned across `.nvmrc`, package engines, CI, and docs.
- Keep security automation aligned with the areas where user data or future service boundaries can be affected.
- Keep static bundle budget changes explicit and tied to user value.
- Keep deployment base-path assumptions tested rather than relying on manual live-site checks alone.
- Keep architecture decisions explicit through ADRs when they affect data, deployment, quality gates, or service boundaries.

## Near-Term Product Roadmap

- Add richer practice history charts.
- Add configurable daily goals and weekly targets.
- Add richer practice plans that combine mastery streaks and spaced review.
- Add expanded ranges, sharps, and flats.
- Add MIDI keyboard input.
- Add anonymous local profile naming.
- Add sign-in behind a feature flag.
- Add cloud sync for completed sessions and settings.

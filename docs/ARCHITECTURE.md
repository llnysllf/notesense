# NoteSense Architecture

NoteSense is currently a local-first React application. The product goal is to keep the practice loop fast and polished while preserving clean seams for future sign-in, cloud storage, sync, and managed web services.

## Current Shape

- `src/practiceEngine.ts` owns scoring, adaptive weighting, session summaries, trend summaries, and analytics helpers. It is pure TypeScript and does not depend on React or browser storage.
- `src/storage.ts` owns persistence, normalization, migration from the original local progress shape, and versioned data import/export.
- `src/audio.ts` owns browser audio playback.
- `src/components` contains focused UI sections for the staff, pitch prompt, stats panel, session history, practice insights, and stat tiles.
- `src/App.tsx` coordinates product state, round flow, settings, storage calls, and component composition.
- `e2e/app.spec.ts` covers the browser practice loop, accessibility, layout health, insight chart rendering, import/export behavior, and storage failure messaging.

## Quality Bar

Every feature should keep these expectations intact:

- Practice logic remains testable outside React.
- Product analytics and chart inputs are derived in pure functions before rendering.
- Persistence changes go through a storage boundary instead of being scattered through UI components.
- User-visible state has a failure path, especially for save, export, auth, and sync operations.
- Accessibility is part of the feature definition, not a final cleanup step.
- The full `npm run check` gate must pass before a change is considered ready.
- The GitHub Pages build must be verified with the `/notesense/` base path before deployment.

## Local-First Data Model

The app saves progress and settings in browser LocalStorage today. This keeps version 1 useful without accounts or infrastructure, and it gives us a simple offline baseline. Exported data includes:

- `schemaVersion`
- `exportedAt`
- `progress`
- `settings`

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

## Near-Term Product Roadmap

- Add richer practice history charts.
- Add bass clef, expanded range, sharps, and flats.
- Add MIDI keyboard input.
- Add anonymous local profile naming.
- Add sign-in behind a feature flag.
- Add cloud sync for completed sessions and settings.

# NoteSense

[![CI](https://github.com/llnysllf/notesense/actions/workflows/ci.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/llnysllf/notesense/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/deploy-pages.yml)

NoteSense is a small piano sight-reading and ear-training app for beginner musicians. It focuses on two practical habits: reading notes on starter treble and bass staffs and recognizing natural piano pitches by ear, then adapts practice toward weak notes and pitches.

Live demo: [https://llnysllf.github.io/notesense/](https://llnysllf.github.io/notesense/)

Architecture notes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
Quality runbook: [docs/QUALITY.md](docs/QUALITY.md)
Release guide: [docs/RELEASE.md](docs/RELEASE.md)
Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
Security policy: [SECURITY.md](SECURITY.md)

## Features

- Timed 60-second note-reading drill
- Treble and bass clef starter ranges
- Interactive SVG staff with ledger-line support
- Saved reading-range setting for treble or bass practice
- Keyboard or button answers for C, D, E, F, and G
- Pitch-training mode across one natural-note octave, C4 to B4
- Hidden pitch reveal after each answer
- Instant correct/incorrect feedback
- Web Audio note playback for ear association
- Separate local progress tracking for note reading and pitch training
- Focus-note and focus-pitch stats for weak areas
- Adaptive practice that weights weak notes and pitches more often
- Configurable 30, 60, or 90 second rounds
- Round summary with score, accuracy, best streak, and next-practice suggestion
- Recent practice history with accuracy, time, and streak analytics
- Daily practice goal with streak and practice-time tracking
- Practice insight trend chart for recent accuracy, streak, and time
- Practice plan coach that recommends baseline, focus, recovery, steady, or stretch sessions
- Mastery map that labels each active note or pitch as new, learning, focus, or strong
- Local data import/export and storage-failure messaging

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- Playwright
- axe-core
- ESLint
- Prettier
- CSS design tokens
- Accessible SVG trend chart
- Tested practice-plan recommendation engine
- Tested mastery-state model for active note ranges
- Tested daily-goal and streak analytics
- Browser Web Audio API
- LocalStorage for progress persistence
- Versioned JSON import/export for local data portability
- Local-first analytics for session history

## Why I Built It

I am learning piano and wanted a simple tool to improve note-reading speed and pitch recognition. The project is intentionally small, but it is built like a real product: reusable note data, adaptive practice logic, persistent practice stats, responsive UI, and a clear roadmap for stronger ear-training and MIDI input.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Create the GitHub Pages build:

```bash
npm run build:pages
```

Run the test suite:

```bash
npm test
```

Run the browser and accessibility test suite:

```bash
npm run test:e2e
```

Run static code-quality checks:

```bash
npm run format:check
npm run lint
```

Run the full local quality check:

```bash
npm run check
```

Run the full local release verification gate:

```bash
npm run verify
```

## Engineering Notes

- Practice selection and summary logic live in `src/practiceEngine.ts` so the learning behavior can be tested outside React.
- Practice-plan recommendations are derived in `src/practiceEngine.ts`, keeping the coaching layer deterministic and ready for a future service boundary.
- Mastery map state is derived in `src/practiceEngine.ts` from the active range, note attempts, and accuracy thresholds.
- Daily goal and streak state is derived from completed session history, keeping habit analytics independent from browser storage.
- `src/noteData.ts` keeps treble, bass, and pitch-note definitions structured so new ranges can be added without rewriting the practice loop.
- UI-only pieces live in `src/components` to keep the main app focused on state and orchestration.
- `PracticeStatsPanel` and `SessionHistory` isolate the progress sidebar from the drill loop, which keeps product analytics UI easier to evolve.
- `PracticeInsights` renders tested trend data from `practiceEngine.ts` as an accessible SVG chart.
- CSS custom properties define shared color, spacing, radius, and shadow tokens so the interface can be tuned consistently.
- Progress, history, and settings are normalized when loaded from LocalStorage, including migration from the original V1 progress shape.
- Save operations fail safely and surface a non-blocking status message when browser storage is unavailable.
- Imported and exported practice data includes a schema version, timestamp, progress, and settings for local-first data portability.
- The architecture notes document the local-first data model and the path toward sign-in, backend APIs, cloud storage, and sync.
- Keyboard answers, ARIA pressed states, live feedback, visible focus rings, and reduced-motion support are included for accessibility.
- ESLint enforces TypeScript, React hooks, React refresh, and JSX accessibility rules with zero warnings allowed.
- Prettier formatting is enforced before the test suite runs.
- The test suite covers adaptive weighting, deterministic note selection, focus-note ranking, session summaries, session-history analytics, and progress reducers.
- Playwright and axe-core cover the browser practice loop, responsive layout, console health, and automated accessibility violations.
- `npm run verify` is the single local gate before release, combining code quality, unit/browser tests, accessibility checks, and the Pages build.
- GitHub Actions run formatting, linting, typechecking, unit tests, and browser tests on every push and pull request.
- Pull requests also build the GitHub Pages artifact and upload browser failure artifacts for debugging.
- Dependabot keeps npm minor/patch updates and GitHub Actions dependencies on a weekly maintenance cadence; major npm upgrades are handled as intentional engineering tasks.
- CODEOWNERS, issue templates, ADRs, and the release guide keep review, planning, and deployment expectations explicit.
- The `main` branch publishes a static production build to GitHub Pages.

## Current Scope

The current version is deliberately focused:

- Two practice modes
- Two starter sight-reading clefs
- Ten starter reading notes across treble and bass
- Seven natural pitch-training notes
- Adaptive or random practice selection
- Configurable round length
- Session summaries
- Daily practice goal
- Capped local session history
- Recent practice insight chart
- Derived practice plan coach
- Derived mastery map for active notes and pitches
- Local JSON data import/export
- Tested practice engine
- Enforced formatting and linting
- Browser-level accessibility and smoke tests
- CI quality gate
- GitHub Pages deployment
- No backend
- No login
- No sharps or flats

This keeps the practice loop fast and finishable while leaving room for meaningful future features.

## Roadmap

- Expand note ranges
- Add sharps and flats
- Add interval training
- Add MIDI keyboard input
- Add sign-in and cloud sync for practice history
- Add a service-backed profile and storage layer when the learning loop needs cross-device persistence

## Portfolio Summary

Built a piano sight-reading and ear-training app using React and TypeScript, with adaptive timed drills, interactive notation, pitch recognition, Web Audio playback, daily goals, session summaries, a tested practice-plan coach, a mastery map, accessible practice-insight charts, local session-history analytics, versioned data portability, CI/CD, and browser-level accessibility testing.

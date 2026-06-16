# NoteSense

[![CI](https://github.com/llnysllf/notesense/actions/workflows/ci.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/ci.yml)
[![Visual Regression](https://github.com/llnysllf/notesense/actions/workflows/visual-regression.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/visual-regression.yml)
[![Deploy Pages](https://github.com/llnysllf/notesense/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/deploy-pages.yml)
[![CodeQL](https://github.com/llnysllf/notesense/actions/workflows/codeql.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/codeql.yml)
[![Dependency Review](https://github.com/llnysllf/notesense/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/dependency-review.yml)

> A local-first piano sight-reading and ear-training app for beginner musicians.

NoteSense helps new pianists build two practical habits: **reading** starter treble and bass staff notes, and **recognizing** natural piano pitches by ear. Practice adapts toward your weakest notes and pitches while keeping the product small, fast, accessible, and private.

**🎹 Live demo: [llnysllf.github.io/notesense](https://llnysllf.github.io/notesense/)**

| Light                                                                         | Dark                                                                        |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| ![NoteSense note-reading drill in light mode](docs/media/notesense-light.png) | ![NoteSense note-reading drill in dark mode](docs/media/notesense-dark.png) |

## Features

- Timed note-reading drills for starter treble and bass ranges
- Pitch-training mode across natural notes C4–B4
- Adaptive or random practice selection that targets weak notes
- Keyboard and on-screen button answers, with Web Audio playback for ear association
- Instant feedback, optional pitch reveal, and round summaries (score, accuracy, best streak)
- Daily goal, streak, recent history, a practice-insight chart, a practice-plan coach, and a mastery map
- Local JSON import/export with schema validation and safe storage-failure handling
- Automatic light/dark theme, installable PWA, and offline practice after first load

## Tech stack

| Area        | Choices                                                       |
| ----------- | ------------------------------------------------------------- |
| Core        | React, TypeScript, Vite                                       |
| Testing     | Vitest, Playwright, axe-core                                  |
| Quality     | ESLint, Prettier                                              |
| UI          | CSS design tokens with automatic light/dark theming           |
| Platform    | `vite-plugin-pwa` service worker, Web Audio API, LocalStorage |
| Portability | Versioned JSON import/export                                  |

## Getting started

Use the Node.js version pinned in `.nvmrc`.

```bash
nvm use
npm ci
npm run dev
```

Common tasks:

```bash
npm run build        # Production build
npm run build:pages  # GitHub Pages build
npm test             # Unit tests
npm run check        # Format, docs, lint, typecheck, unit + e2e tests
npm run verify       # Full local release verification gate
```

## Project structure

```text
src/
  App.tsx            App shell, state, and orchestration
  practiceEngine.ts  Adaptive selection, summaries, coaching, mastery (framework-free)
  noteData.ts        Treble, bass, and pitch-note definitions
  storage.ts         LocalStorage load/normalize/migrate + safe-save
  audio.ts           Web Audio playback
  components/        Presentational UI (charts, staff, panels, error boundary)
  hooks/             Session, progress, settings, and data-portability hooks
shared/              Framework-agnostic import/export, normalization, and merge logic
docs/                Architecture, contracts, runbooks, and ADRs
scripts/             Quality, security, and governance gate scripts
e2e/                 Playwright browser, resilience, pages, and visual suites
```

Worth knowing:

- Practice selection, summaries, plan recommendations, and mastery state live in `src/practiceEngine.ts`, so learning behavior is testable outside React and ready for a future service boundary.
- Progress, history, and settings are normalized on load (including migration from the original V1 shape); saves fail safely with a non-blocking message when storage is unavailable.
- The UI is driven by CSS custom properties, so a single `prefers-color-scheme` block supplies the dark theme without touching component code.
- An app-level React error boundary keeps unexpected render failures from blanking the product.

## Engineering standards

NoteSense is small but maintained like a production product. Beyond the usual tests, it ships a set of focused **contract checks** that make architecture, accessibility, performance, security/privacy, dependency, release, and operations drift visible before it becomes expensive. Each contract has a doc in [`docs/`](docs) and a script in [`scripts/`](scripts), and they all run as part of `npm run verify`.

The full quality system is documented in **[docs/QUALITY.md](docs/QUALITY.md)**; the architecture and its boundaries are in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

Highlights:

- **Local-first** — no account, backend, tracking, telemetry, cookies, or third-party scripts; a runtime-surface check enforces this boundary.
- **Tested** — unit coverage thresholds for the practice/storage core, plus Playwright + axe-core across Chromium, Firefox, and WebKit, a mobile profile, visual-regression, resilience, and a Pages smoke test.
- **Secure supply chain** — pinned, least-privilege GitHub Actions, lockfile integrity, license policy, CodeQL, and Dependency Review on every PR.
- **Release discipline** — a Content Security Policy, bundle budget, and PWA checks gate the build; `main` deploys a static build to GitHub Pages.

## Documentation

| Topic                  | Link                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Architecture           | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                                         |
| Quality runbook        | [docs/QUALITY.md](docs/QUALITY.md)                                                   |
| Architecture decisions | [docs/adr/README.md](docs/adr/README.md)                                             |
| Product scope          | [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md)                                       |
| Testing strategy       | [docs/TESTING.md](docs/TESTING.md)                                                   |
| Accessibility          | [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md)                                       |
| Performance            | [docs/PERFORMANCE.md](docs/PERFORMANCE.md)                                           |
| Browser support        | [docs/BROWSER_SUPPORT.md](docs/BROWSER_SUPPORT.md)                                   |
| Data contract          | [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md)                                       |
| Security & privacy     | [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md)                                 |
| Privacy                | [docs/PRIVACY.md](docs/PRIVACY.md)                                                   |
| Threat model           | [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)                                         |
| Operations             | [docs/OPERATIONS.md](docs/OPERATIONS.md)                                             |
| Observability          | [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md)                                       |
| Release & safety       | [docs/RELEASE.md](docs/RELEASE.md), [docs/RELEASE_SAFETY.md](docs/RELEASE_SAFETY.md) |
| Backend readiness      | [docs/BACKEND_READINESS.md](docs/BACKEND_READINESS.md)                               |
| Contributing           | [CONTRIBUTING.md](CONTRIBUTING.md)                                                   |
| Code of Conduct        | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)                                             |
| Security policy        | [SECURITY.md](SECURITY.md)                                                           |
| Legal                  | [docs/LEGAL.md](docs/LEGAL.md)                                                       |
| Changelog              | [CHANGELOG.md](CHANGELOG.md)                                                         |

## Scope

The current version is deliberately focused so the practice loop stays fast and finishable: two practice modes, two starter clefs, ten starter reading notes, seven natural pitch notes, adaptive/random selection, configurable rounds, session summaries, daily goal, capped history, insight chart, coach, and mastery map — with local JSON import/export, no backend, no login, and no sharps or flats. See [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) for the full scope contract and non-goals.

Future work begins from product evidence, not feature count: expand note ranges, add sharps/flats and interval training, MIDI input, and eventually sign-in with cloud sync behind a reviewed backend.

## License

All rights reserved. See [LICENSE](LICENSE) and the [legal and licensing contract](docs/LEGAL.md).

## About

I am learning piano and wanted a simple tool to improve note-reading speed and pitch recognition. The project is intentionally small, but built like a real product: reusable note data, adaptive practice logic, persistent stats, a responsive and accessible UI, versioned data portability, full CI/CD, and a clear roadmap toward stronger ear-training and MIDI input.

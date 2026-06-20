# Changelog

All notable changes to NoteSense are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). NoteSense uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Foundation polish for the app shell, responsive behavior, session status affordance, dark-mode tokens, and refreshed visual/docs screenshots
- Design-system contract with `docs/DESIGN_SYSTEM.md`, `npm run design:check`, and ADR coverage for tokens, component states, accessibility affordances, and protected visual surfaces
- Architecture-boundary check with `npm run architecture:check` to keep shared contracts, practice logic, storage, hooks, and components in clear source layers
- Operations runbook documenting release-health signals, incident triggers, triage, rollback, evidence handling, and future observability expectations
- Release-notes contract with `npm run release:notes` to keep `CHANGELOG.md` aligned with `package.json` and release structure
- Data-contract documentation and `npm run data:check` for LocalStorage keys, export schema, import normalization, privacy docs, and browser coverage
- Accessibility contract with `docs/ACCESSIBILITY.md` and `npm run accessibility:check` for keyboard, screen reader, focus, motion, axe, cross-browser, and Lighthouse coverage
- Accessibility conformance review contract for WCAG 2.2 Level AA alignment, assistive-technology review planning, and release evidence
- Internationalization and localization readiness contract with `docs/I18N.md` and `npm run i18n:check` for English-only boundaries, future locale strategy, notation labels, layout, accessibility, data stability, and review guidance
- Testing contract with `docs/TESTING.md` and `npm run testing:check` for test ownership, coverage thresholds, Playwright configs, browser specs, and CI evidence
- Hook-focused unit coverage for settings, progress, data portability, and practice-session orchestration
- App-shell coverage gate for settings, rounds, import/export, reset, mode switching, and status coordination
- Component coverage for practice plan, insight chart, pitch prompt, session history, and stat tile rendering
- Web Audio playback coverage for oscillator setup, gain envelope scheduling, and audio-context reuse
- Note-catalog and stats-panel coverage for range invariants, seeded progress, settings controls, and data actions
- Local-only render and runtime-failure reporting helpers with bounded report shapes and focused unit coverage
- Shared contract-check helper with whitespace-normalized snippet matching and focused unit coverage
- ADR governance with `docs/adr/README.md` and `npm run adr:check` for decision numbering, status, required sections, and index links
- Product-scope contract with `docs/PRODUCT_SCOPE.md` and `npm run product:check` for current scope, explicit non-goals, feature intake, and foundation-first expectations
- Product-learning and feedback contract with `docs/PRODUCT_LEARNING.md` and `npm run product:learning` for feedback loops, future analytics and experiment rules, feature-flag expectations, delivery-metric timing, and review/release guidance
- Review/intake contract with `docs/REVIEW_PROCESS.md` and `npm run review:check` for CODEOWNERS, issue templates, PR evidence, security-report routing, and triage guidance
- Support policy with `.github/SUPPORT.md` and review-process checks for support boundaries, privacy-safe reports, issue routing, security routing, and non-SLA expectations
- Dependency-maintenance contract with `docs/DEPENDENCY_MAINTENANCE.md` and `npm run dependencies:check` for Dependabot cadence, lockfile policy, license policy, SBOM policy, supply-chain gates, and workflow-update expectations
- Browser-support contract with `docs/BROWSER_SUPPORT.md` and `npm run browsers:check` for supported engines, mobile viewports, Pages base path, visual-regression profiles, PWA/runtime boundaries, and browser verification evidence
- Performance contract with `docs/PERFORMANCE.md` and `npm run performance:check` for bundle budgets, Lighthouse thresholds, metadata/PWA/runtime checks, Pages smoke coverage, and performance-review guidance
- Operations contract check with `npm run operations:check` for release-health signals, post-release verification, incident triage, rollback, evidence handling, observability boundaries, and operations-review guidance
- Observability and incident-learning contract with `docs/OBSERVABILITY.md`, `docs/POSTMORTEM_TEMPLATE.md`, and `npm run observability:check` for production visibility, future telemetry rules, incident reviews, SLO/SLA boundaries, and review/release guidance
- Release-safety and provenance contract with `docs/RELEASE_SAFETY.md` and `npm run release:safety` for direct-to-Pages release boundaries, staging/canary triggers, rollback expectations, artifact/provenance expectations, and release-review guidance
- Security/privacy contract with `docs/SECURITY_PRIVACY.md` and `npm run security:privacy` for local-first privacy, import/export trust, runtime/network boundaries, CSP, PWA behavior, future auth/sync, backend readiness, and review/release evidence
- SBOM generation gate with `npm run security:sbom`, validating npm SPDX output from the committed lockfile inside the supply-chain release gate
- Legal/licensing contract with a root `LICENSE`, `docs/LEGAL.md`, `license: "UNLICENSED"`, and `npm run legal:check` for project-license, package metadata, user-facing legal, dependency-license boundary, and review/release guidance
- Code of Conduct policy for repository participation, reporting, enforcement, and legal-contract alignment
- GitHub Actions workflow policy gates that require immutable action references and least-privilege token permissions
- GitHub repository governance check for branch protection, required checks, repository security settings, vulnerability alerts, Pages, and active workflows
- Dependency Review workflow for pull requests that introduce dependency or lockfile changes
- Live deployment verifier now checks the deployed service worker, Workbox runtime, and static precache contract after release
- Visual regression workflow for desktop/mobile and light/dark note-reading and pitch-training shells
- Threat model and backend-readiness docs for future sign-in, API, PostgreSQL, and cloud sync work
- Playwright workflow suites now block service workers, keeping UI behavior tests deterministic while PWA behavior remains covered by artifact and live deployment gates
- Dark mode via `prefers-color-scheme: dark` — all design tokens now adapt to the system preference
- Service worker and offline support — the app is now installable as a PWA and works without a network connection after the first load
- Component tests for `MusicStaff`, `DailyGoal`, and `MasteryMap` using `@testing-library/react`
- Lighthouse CI quality gate — automated scoring of Performance, Accessibility, Best Practices, and SEO on every push
- Cross-browser end-to-end testing on Firefox and WebKit (Safari engine) alongside the existing Chromium and mobile Chromium profiles, exercising the Web Audio practice loop and axe-core accessibility scans on all three engines
- `npm run docs:screenshots` reproducibly captures the light and dark README screenshots from a production build
- `CHANGELOG.md` to track all notable changes going forward

### Changed

- Observability and product-learning contract checks now verify Markdown headings and npm script wiring structurally instead of relying on exact prose snippets for those stable contracts.
- Extracted `usePracticeSession`, `useSettings`, `usePracticeProgress`, and `useDataPortability` custom hooks from `App.tsx` — `App` is now a thin coordinator rather than a god component
- `color-scheme` meta tag updated to `light dark` so browsers render system controls in the correct scheme

## [0.16.0] — 2026-06-08

### Added

- Built security policy gate verifies the injected CSP against the expected policy before release
- Documentation integrity gate checks that all policy docs, npm scripts, and Markdown links are consistent

## [0.15.0] — 2026-06-07

### Added

- Runtime surface gate rejects unapproved network calls, cookies, and external URLs in the client source
- Privacy policy documentation describing the local-first data boundary
- Web metadata contract gate validates the built HTML shell, manifest, icon, robots, and sitemap after every Pages build
- Runtime resilience Playwright suite proves the error boundary recovers correctly under a forced render failure
- GitHub Pages smoke test verifies the built app loads from the `/notesense/` base path

## [0.14.0] — 2026-06-07

### Added

- Bundle performance budget gate enforces raw and gzip size limits on the Pages build
- Live deployment verifier confirms the public GitHub Pages URL, metadata assets, and CSP after release
- Content Security Policy injected into the built HTML to restrict scripts, styles, connections, and workers

## [0.13.0] — 2026-06-07

### Added

- `npm run verify` single release gate combining security audit, license compliance, quality checks, browser tests, bundle budgets, and the Pages smoke test
- Core coverage gate enforces statement, branch, function, and line thresholds for `practiceEngine.ts` and `storage.ts`
- TypeScript compiler strictness hardened with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, and `noUnusedLocals`/`noUnusedParameters`

## [0.12.0] — 2026-06-07

### Added

- Dependency license compliance check against the project policy
- `npm run security:audit` high-severity npm audit gate
- CodeQL workflow scanning JavaScript and TypeScript on pushes and a weekly schedule

## [0.11.0] — 2026-06-07

### Added

- App-level React error boundary that renders an accessible recovery screen on unexpected render failures

## [0.10.0] — 2026-06-07

### Added

- Practice insight trend chart — an accessible SVG visualising accuracy, streak, and time across recent sessions
- Practice plan coach recommending baseline, focus, recovery, steady, or stretch sessions from derived session state
- Mastery map labelling each active note or pitch as new, learning, focus, or strong
- Daily practice goal with session count, streak, and today's practice time

## [0.9.0] — 2026-06-06

### Added

- Session history panel with per-mode accuracy, time, and streak analytics
- Round summary after each session with score, accuracy, best streak, and a next-practice suggestion
- Versioned JSON import and export for local-first data portability
- Storage failure messaging when `localStorage` is unavailable or full

## [0.8.0] — 2026-06-05

### Added

- Adaptive practice mode that weights weak notes and pitches more often using attempt and accuracy history
- Configurable 30, 60, or 90 second round lengths
- Separate progress tracking for note reading and pitch training modes

## [0.7.0] — 2026-06-05

### Added

- Pitch training mode across natural notes C4–B4 with Web Audio playback, hidden pitch reveal, and ear-training stats
- Bass clef starter range covering C3–G3

## [0.6.0] — 2026-06-04

### Added

- Interactive SVG staff with ledger-line support for notes outside the main staff
- Keyboard shortcut answers alongside button answers
- Instant correct/incorrect feedback with auto-advance after 650 ms

## [0.5.0] — 2026-06-04

### Added

- Timed 60-second note-reading drill with a start/finish round flow
- Treble clef starter range covering C4–G4
- `localStorage` progress persistence with v1→v2 migration and defensive normalisation

## [0.1.0] — 2026-06-01

### Added

- Initial project scaffolding: React, TypeScript, Vite, Vitest, Playwright, ESLint, Prettier
- CI quality gate on GitHub Actions
- GitHub Pages deployment workflow
- Dependabot, CODEOWNERS, PR template, and issue templates

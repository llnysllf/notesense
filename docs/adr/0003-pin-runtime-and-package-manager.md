# ADR 0003: Pin Runtime And Package Manager

## Status

Accepted

## Context

NoteSense depends on modern React, Vite, TypeScript, Playwright, and ESLint tooling. These tools can behave differently across Node and npm versions, especially in CI, Dependabot branches, and fresh local clones.

## Decision

Pin the development runtime contract in source control:

- `.nvmrc` defines the exact Node.js version used by local development and GitHub Actions.
- `package.json` declares the supported Node and npm engine ranges.
- `packageManager` records the npm version used for the current lockfile.
- `.npmrc` enables engine enforcement during install.
- GitHub Actions read the Node version from `.nvmrc` instead of duplicating it in workflow files.

## Consequences

- Local installs, CI, deployment, and dependency maintenance use the same runtime expectation.
- Runtime upgrades become intentional engineering changes with reviewable diffs.
- Contributors get a clear failure when their Node version is outside the supported range.
- The project avoids hidden drift between laptop development and GitHub Pages deployment.

# ADR 0007: Add Dependency License Gate

## Status

Accepted

## Context

NoteSense depends on npm packages for React, TypeScript, Vite, Playwright, linting, testing, and accessibility checks. Security scanning catches known vulnerabilities, but it does not prove that dependency licenses are acceptable for a portfolio product that may later become a hosted service.

## Decision

Add a dependency license compliance gate:

- `npm run compliance:licenses` reads `package-lock.json`.
- The check fails on missing license metadata, unknown licenses, or restricted license families such as GPL, AGPL, LGPL, and SSPL.
- `npm run verify` runs the license check after the security audit and before the rest of the release gate.

The current allowlist covers the licenses present in the lockfile:

- 0BSD
- Apache-2.0
- BlueOak-1.0.0
- BSD-2-Clause
- BSD-3-Clause
- CC-BY-4.0
- CC0-1.0
- ISC
- MIT
- MIT-0
- MPL-2.0
- Python-2.0

## Consequences

- Dependency license drift becomes visible in local verification and CI.
- New dependency licenses require an intentional policy update.
- Future backend, auth, sync, or commercial-service work starts from a cleaner supply-chain baseline.
- The check stays dependency-free and runs wherever the existing Node runtime runs.

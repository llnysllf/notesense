# Dependency Maintenance Contract

NoteSense depends on a small client-side toolchain, but dependency changes can still affect security, browser behavior, bundle size, licensing, and release confidence. This contract keeps routine updates small and makes risky upgrades explicit.

Project licensing expectations live in [LEGAL.md](LEGAL.md).

Release safety and provenance expectations live in [RELEASE_SAFETY.md](RELEASE_SAFETY.md).

## Sources

- npm dependencies live in `package.json` and `package-lock.json`.
- The lockfile is committed and installed with `npm ci`.
- The supported package manager is the npm version pinned in `package.json`.
- GitHub Actions dependencies live in `.github/workflows`.
- Dependabot owns routine npm and GitHub Actions update proposals.

## Dependabot Policy

- npm minor and patch updates run weekly on Monday at 09:00 Pacific/Auckland time.
- GitHub Actions updates run weekly on Monday at 09:30 Pacific/Auckland time.
- Dependabot keeps at most five open npm update pull requests and five open GitHub Actions update pull requests.
- Routine npm updates are grouped into app runtime dependencies and tooling dependencies.
- CodeQL GitHub Actions updates are grouped so `github/codeql-action/init` and `github/codeql-action/analyze` move together.
- npm major upgrades are ignored by Dependabot and should be opened as intentional engineering tasks.

## Update Classes

- Routine npm minor or patch updates should keep the current Node/npm runtime, package manager, lockfile format, license policy, and release gates intact.
- Major npm upgrades should explain peer dependency, browser coverage, bundling, Playwright, Vitest, Vite, ESLint, TypeScript, and migration risk before implementation.
- Node or npm runtime upgrades should update `.nvmrc`, package engines, `packageManager`, lockfile metadata, GitHub Actions behavior, documentation, and ADRs together.
- GitHub Actions updates should preserve full-SHA pinning, source-version comments, least-privilege token permissions, concurrency, timeouts, and artifact-retention controls.
- CodeQL workflow updates should keep `github/codeql-action/init` and `github/codeql-action/analyze` pinned to the same commit SHA.
- New production dependencies should explain learner value, security posture, license acceptability, bundle impact, and why the behavior should not stay in project code.
- Dependency license compliance does not grant project source-code rights; the root project license stays governed by [LEGAL.md](LEGAL.md) and [../LICENSE](../LICENSE).

## Review Evidence

Dependency PRs should show:

- `npm run dependencies:check`
- `npm run security:lockfile`
- `npm run compliance:licenses`
- `npm run security:sbom`
- `npm run security:audit`
- `npm run verify` for release-ready dependency changes
- passing remote Dependency Review and CodeQL checks
- bundle-budget and Lighthouse impact when runtime dependencies affect built output
- SBOM or provenance changes should be generated from the committed lockfile, validated with `npm run security:sbom`, and reviewed with dependency-maintenance evidence.
- an explanation for new licenses, new packages, major upgrades, runtime upgrades, or workflow action changes

## Change Rules

- Update this contract when Dependabot cadence, grouping, ignored update types, package manager policy, lockfile policy, license policy, SBOM policy, Dependency Review expectations, or workflow action policy changes.
- Run `npm run dependencies:check` after dependency-maintenance, Dependabot, lockfile-policy, license-policy, SBOM-policy, or workflow-update-policy changes.
- Keep security, quality, release, architecture, testing, contributing, and PR review guidance aligned when dependency maintenance changes.

## Verification

`npm run dependencies:check` verifies that:

- this contract keeps source, Dependabot, update-class, review-evidence, change-rule, and verification sections
- Dependabot keeps the reviewed npm and GitHub Actions cadence, grouping, open-PR limits, and npm major-upgrade policy
- package scripts keep dependency maintenance, supply-chain, lockfile, license, audit, SBOM, workflow, and release gates available
- README, contributing, security, quality, release, architecture, testing, ADR, changelog, and PR review guidance stay connected to dependency maintenance

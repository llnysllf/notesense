# ADR 0025: Add Repository Governance Check

## Status

Accepted

## Context

NoteSense now depends on several GitHub-hosted controls: branch protection, required pull-request checks, CODEOWNERS review, Dependency Review, CodeQL, Pages deployment, Dependabot security updates, vulnerability alerts, secret scanning, and workflow activation.

Those controls are outside the local source tree, so they can drift without a code diff. This happened when Dependency Review was added before the repository dependency graph and vulnerability-alert plumbing had been verified.

## Decision

Add `npm run ops:repository` through `scripts/check-github-repository.mjs`.

The check uses the GitHub CLI to verify:

- repository visibility, default branch, Pages, archived state, and disabled state
- secret scanning and secret scanning push protection
- Dependabot security updates and vulnerability alerts
- branch protection on `main`
- strict required status checks
- absence of mandatory pull-request reviews for the solo-maintainer repository, plus conversation resolution, linear history, force-push protection, and deletion protection
- active GitHub Actions workflows

Keep `npm run ops:repository` separate from `npm run verify` because it requires GitHub authentication, network access, and live repository state.

## Consequences

- Repository governance drift can be checked intentionally after remote settings change.
- Local contributors can still run `npm run verify` without GitHub credentials.
- Release and quality docs can point to a concrete command instead of relying on manual inspection.
- The governance policy must be updated when required checks, workflows, branch protection, or repository security settings intentionally change.

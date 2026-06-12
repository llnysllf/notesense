# ADR 0024: Add Dependency Review Workflow

## Status

Accepted

## Context

NoteSense already runs `npm audit`, dependency license checks, Dependabot, CodeQL, pinned workflow actions, and least-privilege workflow permission checks. Those controls protect the default branch and local release gate, but dependency pull requests should also get a diff-aware review before merge.

GitHub Dependency Review compares dependency changes in a pull request and can block newly introduced vulnerable dependencies or invalid licenses before they reach `main`.

## Decision

Add a pull-request-only `Dependency Review` workflow using `actions/dependency-review-action` pinned to the reviewed `v5.0.0` commit.

The workflow:

- runs on `pull_request`
- uses `contents: read` only
- fails on high or critical vulnerable dependency changes
- keeps vulnerability and license checks enabled
- avoids pull-request comment writes by setting `comment-summary-in-pr: never`

Keep this workflow covered by:

- `npm run security:workflow-actions`
- `npm run security:workflow-permissions`
- `npm run docs:check`

## Consequences

- Dependency and lockfile pull requests get a PR-time supply-chain gate in addition to `npm run verify`.
- The gate does not run on direct pushes because Dependency Review is meaningful only when GitHub can compare pull-request dependency changes.
- Future changes to the workflow must preserve pinned action SHAs and least-privilege permissions.
- Branch protection should require the `Dependency review` check for pull requests once the workflow has landed on `main`.

# ADR 0023: Enforce Workflow Token Permissions

## Status

Accepted

## Context

GitHub Actions receives a `GITHUB_TOKEN` for workflow automation. Even when a workflow only needs read access, broad or inherited permissions increase the impact of a compromised action, script, dependency install, or workflow change.

NoteSense already pins workflow actions to immutable commit SHAs. The next supply-chain control is to make token permissions explicit, minimal, and reviewable for each workflow and job.

## Decision

Keep workflow token permissions least-privilege and enforce the reviewed policy with `npm run security:workflows`.

Add `scripts/check-workflow-permissions.mjs` to verify that:

- every workflow declares exactly one top-level `permissions` block
- CI, visual regression, Lighthouse, and CodeQL use only the reviewed top-level permissions they need
- the Pages workflow disables top-level token permissions and grants permissions at the job level
- the Pages build job has `contents: read` only
- the Pages deploy job has `pages: write` and `id-token: write` only

Split the workflow security gate into focused subcommands:

- `npm run security:workflow-actions`
- `npm run security:workflow-permissions`
- `npm run security:workflows`

## Consequences

- Workflow permission drift fails locally and in CI through `npm run verify`.
- Pages deployment permissions are limited to the deployment job instead of the build job.
- Future workflow changes must update the policy script and docs when a new permission is genuinely needed.
- Dependabot and manual GitHub Actions updates must preserve both pinned action SHAs and least-privilege token permissions.

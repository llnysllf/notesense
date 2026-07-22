# ADR 0059: Automate Verified Dependabot Updates

## Status

Accepted

## Context

NoteSense has one maintainer. Requiring an approving reviewer and a CODEOWNERS approval creates recurring friction without providing an independent review. Routine Dependabot minor and patch updates are constrained by `dependabot.yml`, but should also merge without manual intervention once the project checks have passed.

The change must retain strict required checks, conversation resolution, linear history, force-push protection, and deletion protection, and it must not let a privileged workflow execute untrusted pull-request code.

## Decision

Keep the `main` branch-protection policy, but remove its mandatory approving-review and CODEOWNERS-review requirements. The protected quality and security checks remain mandatory for every pull request.

Add a `pull_request_target` workflow that never checks out pull-request code. It accepts only non-draft Dependabot PRs from this repository whose changed files are limited to `package.json`, `package-lock.json`, and workflow YAML. It waits for every required check, then performs a SHA-locked squash merge and deletes the Dependabot branch.

Keep GitHub's generic auto-merge setting disabled. The repository-owned workflow provides the narrower, auditable condition needed for Dependabot updates.

## Consequences

- Human-authored and Dependabot pull requests both retain the same protected quality and security checks, without a mandatory second reviewer.
- Dependabot minor and patch updates merge only after the same required quality and security checks that protect other PRs.
- Major updates remain intentional engineering tasks because Dependabot does not open them automatically.
- `npm run ops:repository` verifies that the legacy branch-protection rule has no required pull-request reviews while retaining the remaining release protections.
- Changes to required checks, workflow permissions, event model, or file allowlist require security, dependency-maintenance, review-process, and repository-governance review.

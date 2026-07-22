# ADR 0059: Automate Verified Dependabot Updates

## Status

Accepted

## Context

NoteSense requires an owner and CODEOWNERS approval, strict required checks, resolved conversations, linear history, and branch protections before a pull request can merge. Routine Dependabot minor and patch updates are constrained by `dependabot.yml`, but requiring the same manual approval for every verified update adds recurring maintenance work without improving the review of human-authored changes.

The exception must not weaken protection for normal pull requests or let a privileged workflow execute untrusted pull-request code.

## Decision

Migrate the `main` protection policy to a repository ruleset with the same status-check, review, CODEOWNERS, conversation-resolution, linear-history, deletion, and force-push controls. Allow only the GitHub Actions integration to bypass that ruleset, only through a pull request.

Add a `pull_request_target` workflow that never checks out pull-request code. It accepts only non-draft Dependabot PRs from this repository whose changed files are limited to `package.json`, `package-lock.json`, and workflow YAML. It waits for every required check, then performs a SHA-locked squash merge and deletes the Dependabot branch.

Keep GitHub's generic auto-merge setting disabled. The repository-owned workflow provides the narrower, auditable condition needed for Dependabot updates.

## Consequences

- Human-authored and non-Dependabot PRs retain owner and CODEOWNERS review requirements.
- Dependabot minor and patch updates merge only after the same required quality and security checks that protect other PRs.
- Major updates remain intentional engineering tasks because Dependabot does not open them automatically.
- `npm run ops:repository` now verifies the ruleset and its GitHub Actions-only pull-request bypass instead of a legacy branch-protection rule.
- Changes to the bypass actor, required checks, workflow permissions, event model, or file allowlist require security, dependency-maintenance, review-process, and repository-governance review.

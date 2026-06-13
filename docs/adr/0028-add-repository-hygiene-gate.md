# ADR 0028: Add Repository Hygiene Gate

## Status

Accepted

## Context

NoteSense already keeps generated output, local reports, dependency installs, environment files, and TypeScript build-info files out of source control through `.gitignore` and `.prettierignore`. It also pins editor, Node, npm, and package-manager conventions in root config files.

Those conventions should be enforced because generated artifacts, local secrets, or runtime drift can make reviews noisy and releases harder to trust.

## Decision

Add `npm run repo:hygiene`, backed by `scripts/check-repository-hygiene.mjs`, and include it in `npm run check`.

The gate verifies:

- required root configuration files exist
- `.gitignore` and `.prettierignore` include reviewed generated-artifact and local-file rules
- `.editorconfig`, `.npmrc`, `.nvmrc`, package engines, and `packageManager` stay aligned with the runtime policy
- generated build/test artifacts, dependency installs, environment files, logs, TypeScript build-info files, and generated Vite config artifacts are not tracked by Git

## Consequences

- Repository hygiene becomes part of the local and CI quality gate.
- Future root config, runtime, ignore-policy, or generated-artifact changes must update the policy and docs intentionally.
- The gate only checks tracked files, so local ignored build output can still exist during development without failing the release gate.

# ADR 0054: Add SBOM Generation Gate

## Status

Accepted

## Context

NoteSense already verifies dependency advisories, lockfile source and integrity, dependency licenses, workflow action pinning, workflow permissions, and workflow operations. Release-safety guidance also says SBOM and provenance evidence must be intentional before the project grows beyond a static Pages app.

The remaining gap is that SBOM readiness was only documented as future work. A big-company-quality foundation should prove that the project can generate a software bill of materials from the committed dependency graph before installable builds, paid releases, external distribution, or backend services make that evidence mandatory.

## Decision

Add `npm run security:sbom`, backed by `scripts/check-sbom.mjs`, and include it in `npm run security:supply-chain`.

The SBOM check runs `npm sbom --sbom-format spdx --json` and validates that:

- npm emits SPDX 2.3 JSON
- the SBOM document name, root package, version, license, and purl match `package.json`
- the SBOM package count matches `package-lock.json`
- packages include npm purls, declared licenses, and SHA512 checksums for registry tarballs
- dependency relationships are present

The generated SBOM is verification evidence, not a committed artifact. Published SBOM artifacts, SLSA provenance attestations, signed release artifacts, and artifact verification remain future release-safety work.

## Consequences

- `npm run verify` now proves SBOM generation through the existing supply-chain gate.
- Dependency and runtime changes get earlier evidence that the locked dependency graph can be represented as SPDX.
- The repository avoids committing large generated SBOM files while the app is still a static local-first Pages product.
- Future published artifacts still need explicit provenance, signing, retention, and verification design before external distribution.

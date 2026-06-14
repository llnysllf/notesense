# Architecture Decision Records

Architecture Decision Records document durable product and engineering decisions that should outlive a single implementation pass.

## Process

- Add an ADR when a change affects data ownership, deployment, quality gates, runtime policy, security posture, release process, service boundaries, or future backend direction.
- Use the next zero-padded number in the `NNNN-short-title.md` filename.
- Keep the heading in the form `# ADR NNNN: Title`.
- Keep the `## Status`, `## Context`, `## Decision`, and `## Consequences` sections.
- Use one of these statuses: `Proposed`, `Accepted`, `Deprecated`, or `Superseded`.
- Update this index in the same change as any ADR addition, rename, status change, or removal.

`npm run adr:check` verifies ADR numbering, required sections, accepted status values, and index links.

## Index

- [ADR 0001: Keep Practice Data Local-First](0001-local-first-practice-data.md) - Accepted
- [ADR 0002: Enforce Quality Gates Before Static Deployment](0002-quality-gates-and-static-deployment.md) - Accepted
- [ADR 0003: Pin Runtime And Package Manager](0003-pin-runtime-and-package-manager.md) - Accepted
- [ADR 0004: Add Security Scanning Gates](0004-add-security-scanning-gates.md) - Accepted
- [ADR 0005: Add Bundle Performance Budget](0005-add-bundle-performance-budget.md) - Accepted
- [ADR 0006: Add Pages Preview Smoke Test](0006-add-pages-preview-smoke-test.md) - Accepted
- [ADR 0007: Add Dependency License Gate](0007-add-dependency-license-gate.md) - Accepted
- [ADR 0008: Add Live Deployment Verifier](0008-add-live-deployment-verifier.md) - Accepted
- [ADR 0009: Add Runtime Error Boundary](0009-add-runtime-error-boundary.md) - Accepted
- [ADR 0010: Add Core Coverage Gate](0010-add-core-coverage-gate.md) - Accepted
- [ADR 0011: Harden TypeScript Compiler Contract](0011-harden-typescript-compiler-contract.md) - Accepted
- [ADR 0012: Add Web Metadata Contract](0012-add-web-metadata-contract.md) - Accepted
- [ADR 0013: Add Policy Docs Gate](0013-add-policy-docs-gate.md) - Accepted
- [ADR 0014: Add Runtime Surface Gate](0014-add-runtime-surface-gate.md) - Accepted
- [ADR 0015: Add Documentation Integrity Gate](0015-add-documentation-integrity-gate.md) - Accepted
- [ADR 0016: Add Built Security Policy Gate](0016-add-built-security-policy-gate.md) - Accepted
- [ADR 0017: Add Cross-Browser End-to-End Coverage](0017-add-cross-browser-e2e-coverage.md) - Accepted
- [ADR 0018: Add Offline PWA And Lighthouse Gate](0018-add-offline-pwa-and-lighthouse-gate.md) - Accepted
- [ADR 0019: Add Live PWA Deployment Verification](0019-add-live-pwa-deployment-verification.md) - Accepted
- [ADR 0020: Add Visual Regression Gate](0020-add-visual-regression-gate.md) - Accepted
- [ADR 0021: Add Threat Model And Backend Readiness Docs](0021-add-threat-model-and-backend-readiness.md) - Accepted
- [ADR 0022: Pin Workflow Actions](0022-pin-workflow-actions.md) - Accepted
- [ADR 0023: Enforce Workflow Token Permissions](0023-enforce-workflow-token-permissions.md) - Accepted
- [ADR 0024: Add Dependency Review Workflow](0024-add-dependency-review-workflow.md) - Accepted
- [ADR 0025: Add Repository Governance Check](0025-add-repository-governance-check.md) - Accepted
- [ADR 0026: Add Lockfile Supply-Chain Policy](0026-add-lockfile-supply-chain-policy.md) - Accepted
- [ADR 0027: Add Workflow Operations Policy](0027-add-workflow-operations-policy.md) - Accepted
- [ADR 0028: Add Repository Hygiene Gate](0028-add-repository-hygiene-gate.md) - Accepted
- [ADR 0029: Add Design System Contract](0029-add-design-system-contract.md) - Accepted
- [ADR 0030: Add Architecture Boundary Check](0030-add-architecture-boundary-check.md) - Accepted
- [ADR 0031: Add Operations Runbook](0031-add-operations-runbook.md) - Accepted
- [ADR 0032: Add Release Notes Contract](0032-add-release-notes-contract.md) - Accepted
- [ADR 0033: Add Data Contract Check](0033-add-data-contract-check.md) - Accepted
- [ADR 0034: Add Accessibility Contract Check](0034-add-accessibility-contract-check.md) - Accepted
- [ADR 0035: Add Testing Contract Check](0035-add-testing-contract-check.md) - Accepted
- [ADR 0036: Add ADR Governance Check](0036-add-adr-governance-check.md) - Accepted

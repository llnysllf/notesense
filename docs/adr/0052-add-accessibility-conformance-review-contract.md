# ADR 0052: Add Accessibility Conformance Review Contract

## Status

Accepted

## Context

NoteSense already has automated accessibility checks, JSX accessibility linting, Lighthouse accessibility scoring, visual-regression coverage, keyboard workflow tests, responsive overflow checks, and a manual review checklist. That is a strong engineering baseline, but it does not state a durable WCAG target or explain which assistive-technology review evidence should accompany accessibility-sensitive UI changes.

Big-company-quality accessibility should make the expected standard explicit before the product grows. A self-assessment target is also clearer than implying formal certification that the project has not earned.

## Decision

Extend `docs/ACCESSIBILITY.md` with:

- a WCAG 2.2 Level AA self-assessment target for the supported browser surface and documented learner workflows
- a clear non-certification boundary for VPAT, ACR, third-party audit, and legal claims
- an assistive-technology review plan covering keyboard-only, VoiceOver, NVDA where available, mobile screen readers when mobile workflows change, 200% zoom, and reduced motion
- release evidence rules for unavailable devices, known gaps, or deferred manual checks

Extend `npm run accessibility:check`, release guidance, quality guidance, architecture guidance, testing guidance, the pull request template, changelog, and ADR index so WCAG and assistive-technology review expectations stay aligned.

## Consequences

- Accessibility review now has an explicit target instead of only a set of automated checks.
- The project avoids overstating accessibility compliance while still setting a professional standard.
- Future UI changes must document manual assistive-technology evidence or known review gaps when the accessibility risk warrants it.
- The contract remains lightweight and local-first; it does not add a new product feature or external accessibility service.

# ADR 0053: Add I18n Readiness Contract

## Status

Accepted

## Context

NoteSense is English-only today, which is appropriate for the current focused portfolio product. The gap is not missing translations; the gap is that future localization rules were implicit. Without a contract, a future language change could scatter translated strings through components, break mobile layout, reinterpret music-learning labels, or accidentally introduce remote translation or locale analytics.

Big-company-quality projects make language boundaries and localization ownership explicit before translation work starts.

## Decision

Add `docs/I18N.md` and `npm run i18n:check`, backed by `scripts/check-i18n-contract.mjs`.

The i18n contract covers:

- the current English-only UI boundary and `lang="en"` HTML metadata
- future message ownership before adding a second supported interface language
- locale-sensitive formatting rules for future dates, numbers, durations, percentages, and lists
- music-learning localization constraints for note names, octave labels, clefs, and notation systems
- accessibility and layout expectations for translated copy, longer labels, screen-reader meaning, and right-to-left language support
- data-stability and privacy boundaries so translated labels stay presentation-only and do not introduce network translation services
- release, review, ADR, product-scope, testing, and browser-support guidance for future localization work

## Consequences

- The project does not pretend to be localized before it is.
- Future localization work has a clear design path instead of ad hoc string edits.
- English-only behavior remains explicit and testable while the foundation is strengthened.
- Localization remains a product, accessibility, privacy, data, testing, and release decision rather than a cosmetic copy pass.

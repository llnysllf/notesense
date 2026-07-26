# Accessibility Contract

NoteSense is a practice tool, so the interface must stay usable without a mouse, understandable to assistive technology, comfortable in light and dark themes, and resilient when browser behavior differs across engines.

Browser support expectations live in [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md).

## Product Standard

- Accessibility is part of the feature definition, not a final cleanup step.
- Learners must be able to start, answer, switch modes, change settings, import/export data, and recover from errors with the keyboard.
- The practice surface must keep clear labels for the current mode, prompt, answers, round status, saved progress, and recovery state.
- UI changes should preserve calm focus behavior and avoid motion that distracts from practice.

## WCAG Alignment

- Current conformance target: NoteSense targets WCAG 2.2 Level AA for the supported browser surface and documented learner workflows.
- This is an owner-maintained self-assessment target, not a third-party accessibility audit, VPAT, ACR, or legal certification.
- Conformance evidence must combine automated checks, keyboard review, visual review, and assistive-technology review notes when UI behavior changes.
- Known gaps, unavailable review devices, or deferred manual checks must be documented in the pull request and release evidence before merge.

## Keyboard And Focus

- All interactive controls use native `button`, `input`, or label patterns unless a stronger semantic reason exists.
- Keyboard shortcuts for answers must complement, not replace, reachable answer buttons.
- Mode, range, and round-length choices expose the selected state with `aria-pressed`.
- Sidebar destinations are links and mark the open screen with `aria-current="page"`, so assistive technology reports navigation rather than a set of toggles.
- Focus rings must remain visible, high contrast, and unclipped at desktop and mobile widths.
- Hidden file inputs must remain reachable through a visible button and carry a useful file-input label.

## Screen Reader Semantics

- The app shell and primary panels use accessible headings, labels, and regions.
- Live round state, feedback, save/import/export status, and error recovery use polite or assertive live regions intentionally.
- SVGs that communicate practice content or trend data use `role="img"` with useful labels.
- Decorative marks, meters, and visual-only helpers use `aria-hidden="true"`.
- Progress indicators that communicate a numeric goal use native ARIA value attributes.
- Localized copy must preserve accessible names, headings, live-region meaning, focus order, and keyboard workflows.

## Visual And Motion

- Color alone must not be the only signal for correctness, selected state, warnings, or progress.
- Text and controls must fit on mobile without horizontal overflow.
- The light and dark themes must preserve readable contrast for text, controls, feedback, focus rings, and charts.
- Motion must respect `prefers-reduced-motion`.
- Visual-regression baselines protect the primary note-reading and pitch-training shells across desktop/mobile and light/dark themes.

## Automated Coverage

`npm run accessibility:check` verifies that the documented accessibility contract stays connected to source, tests, and quality gates.

The current automated coverage includes:

- `eslint-plugin-jsx-a11y` recommended rules in `npm run lint`
- axe-core scans in the main Playwright suite
- axe-core scans for the app-level recovery screen in `npm run test:e2e:resilience`
- keyboard answer coverage in the main Playwright suite
- selected-state assertions for `aria-pressed`
- responsive viewport overflow checks
- cross-browser Playwright projects for Chromium, Firefox, WebKit, and mobile Chromium
- Lighthouse accessibility scoring for the Pages-shaped build
- visual-regression coverage for protected shells

## Assistive Technology Review Plan

When UI behavior, layout, copy, color, motion, controls, charts, prompts, or recovery states change, include assistive-technology review evidence appropriate to the risk:

- keyboard-only navigation from app load through a completed round
- macOS VoiceOver with Safari for primary practice flows when screen reader semantics change
- NVDA with Firefox or Chrome when Windows desktop screen-reader coverage is available
- iOS VoiceOver or Android TalkBack when mobile touch workflows, responsive layout, or mobile-only controls change
- browser zoom at 200% when layout, text wrapping, or responsive density changes
- reduced-motion behavior when animation or transition behavior changes

## Manual Review

When UI behavior, layout, copy, color, motion, controls, charts, prompts, or recovery states change, review:

- keyboard-only navigation from app load through a completed round
- visible focus on every control
- screen reader names for mode, range, answer, data, chart, mastery, and recovery controls
- light and dark contrast for text, feedback, and focus rings
- mobile text wrapping and horizontal overflow
- reduced-motion behavior when animation changes
- whether the WCAG 2.2 Level AA self-assessment target is still credible for the changed workflow

## Change Rules

- Run `npm run accessibility:check` after accessibility-sensitive UI, test, style, Playwright, Lighthouse, design-system, WCAG, assistive-technology review, or release-doc changes.
- Run `npm run browsers:check` after changing supported browsers, device profiles, responsive support, or browser verification evidence.
- Run `npm run test:e2e` after changing core browser workflows, keyboard behavior, ARIA state, responsive layout, or axe coverage.
- Run `npm run test:e2e:resilience` after changing the app shell, root render path, or recovery surface.
- Run `npm run test:e2e:visual` after intentional layout, color, typography, spacing, or component-state changes.
- Update this contract, the design system, quality runbook, release guide, and PR checklist together when accessibility expectations change.

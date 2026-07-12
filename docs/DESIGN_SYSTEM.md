# Design System Contract

NoteSense should feel calm, precise, and practice-focused. The design system is intentionally small, but it should still behave like a product system: shared tokens, predictable component states, accessible controls, and visual-regression coverage for the primary shells.

## Product Posture

- Keep the interface focused on the current practice task, not decoration.
- Prefer dense, readable controls over marketing-style sections.
- Make status visible without interrupting the learner.
- Preserve a quiet, premium feel through spacing, typography, contrast, and restrained motion.
- Do not add new visual patterns unless they support a real learner workflow or reduce implementation risk.

## Token Layers

Shared CSS custom properties in `src/styles.css` own the app-wide design language:

- Color tokens: text, ink, muted text, brand, accent, action, canvas, surface, control, feedback, meter, border, focus, success, and danger.
- Radius tokens: card, control, and pill shapes.
- Shadow tokens: panel, control, action, and sound-ring elevation.
- Spacing tokens: page, panel, card, control, and gap spacing.
- Typography: system UI stack, stable display sizes, and fixed responsive breakpoints instead of viewport-scaled text.

Light and dark themes should be implemented by token substitution inside one `prefers-color-scheme` block. Component selectors should use tokens rather than hard-coded theme colors.
Hard-coded hex, RGB, RGBA, HSL, and HSLA theme colors belong only in token definitions; component selectors should consume `var(...)` tokens so light and dark mode changes stay centralized.

## Component States

The primary app shell must keep these states intentional:

- App shell: two-column desktop, single-column tablet/mobile, no horizontal overflow.
- Header: brand lockup, current practice context, session status, and note replay action.
- Mode switch: selected state, hover state, keyboard focus state, and disabled-free toggling.
- Staff card: protected prompt surface with stable dimensions and a clear visual anchor.
- Answer buttons: hover, active, disabled, keyboard focus, label wrapping, and score feedback compatibility.
- Feedback/status chips: ready, listening/live, saved, correct, wrong, and storage/error text.
- Stats panel: stat tiles, mastery map, insight chart, session history, and empty states.
- Data controls: import/export controls stay reachable and visibly focused.
- Song sheet: the current note is shown in the brand color with a caret under the staff (never a fill that hides staff lines), wrong answers recolor the current note in the danger color, completed events dim, and rhythm glyphs plus accidental markings stay legible in both themes; the score is static and notes never move while playing. The time signature is shown at the start of every staff system, with barlines dividing events into measures.

## Accessibility And Motion

- Every interactive control must be reachable by keyboard and have a visible focus ring.
- State that is visible in color should also be visible through text, labels, or structure.
- Text must fit in compact controls at mobile widths.
- Decorative visuals should stay hidden from assistive technology.
- Motion must respect `prefers-reduced-motion`.
- Audio controls must remain explicit user actions.

## Protected Visual Surface

Visual-regression coverage protects the note-reading and pitch-training shells in:

- desktop light
- desktop dark
- mobile light
- mobile dark

Brand-accent element snapshots (mode switch and primary button) additionally protect the brand palette itself. Brand-colored controls cover a small share of full-page pixels, so the page-level diff ratio alone can miss a re-theme; the accent snapshots are dominated by brand fills and fail loudly when the palette drifts.

Intentional UI changes should refresh screenshots with `npm run test:e2e:visual:update`, review the images, and run `npm run test:e2e:visual`. Palette changes may pass a stale-baseline comparison when backgrounds stay close in luminance; if `--update-snapshots` reports no changes after an intentional re-theme, delete the snapshot directory and regenerate from scratch. README screenshots should be refreshed with `npm run docs:screenshots` when the documented product surface changes.

## Change Process

For UI foundation changes:

1. Update tokens before duplicating one-off values.
2. Keep reusable state styles near the component selectors that use them.
3. Preserve focus, reduced-motion, and mobile wrapping behavior.
4. Run `npm run design:check`.
5. Run visual regression when layout, color, spacing, typography, or component appearance changes.
6. Update this document when a new durable pattern, token group, or protected state is introduced.

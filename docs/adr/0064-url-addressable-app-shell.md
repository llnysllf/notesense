# ADR 0064: Add A URL-Addressable App Shell

## Status

Accepted

## Context

Every NoteSense screen lived behind a single `activeSection` value in React state. That made the whole app one address: a learner could not bookmark the pitch drill, open the mastery map in a new tab, share a link to a settings screen, or use browser back to undo a navigation, and a reload always dropped them back on the default screen. It also meant navigation structure was duplicated between the sidebar component and the workspace switch in `App.tsx`, so the two could drift.

Three constraints shaped the solution. The app ships as a static GitHub Pages site under the `/notesense/` sub-path, and Pages cannot rewrite unknown paths to the app shell, so a direct load of a deep link would 404. The JavaScript budget had roughly 8 KiB of gzip headroom, so a large router was not affordable. And the dependency-license policy allows a specific set of licenses, which rules out otherwise-attractive packages.

## Decision

Introduce real routing, with the URL as the single source of truth for the current destination:

- `src/routes.ts` — a pure, framework-free destination map: id, path, label, group, and the workspace each destination shows. The nav, the router, and the topbar all read from it, and it is unit tested directly. It also owns the `AppSection` type, so hooks and routing do not depend on a presentation component.
- `src/hooks/useAppRoute.ts` — resolves the URL to a destination, reports whether the path was unknown, and exposes navigation helpers.
- `AppSectionNav` renders destinations as real links with `aria-current="page"` for the open screen, replacing buttons with `aria-pressed`. Links can be bookmarked and opened in a new tab, and assistive technology reports navigation rather than a group of toggles.
- **raviger** is the router: MIT licensed, actively maintained, hook-based, and about 2 KiB gzip. `react-router-dom` was measured first and cost about 29.5 KiB gzip — a 38 percent increase in the main bundle for eight destinations — and `wouter` is published under the Unlicense, which the license policy does not allow.
- A build plugin copies the built shell to `404.html`. GitHub Pages serves that file for unknown paths, so a deep link or reload boots the app and the router resolves the real path from the URL.

Destinations are listed only when a screen exists behind them, so Today, Learn, and Account arrive with the slices that build them, and no navigation leads to an empty promise. A route test asserts this.

The total Pages budget moves from 350 KiB raw / 105 KiB gzip to 360 / 110 to cover the router and the fallback shell copy, mirrored in the performance contract and its documentation.

## Consequences

- Screens are bookmarkable and shareable, browser back and forward work, and a reload keeps the learner where they were.
- Navigation structure lives in one tested module instead of being duplicated between the nav and the workspace switch.
- The `404.html` fallback returns an HTTP 404 status even though it renders the app. That is the accepted trade-off for clean paths on Pages; if this becomes a problem for monitoring, hash routing or a host with rewrites are the alternatives.
- Adding a runtime dependency brings the router into supply-chain, license, and update review.
- Changes to the destination map, the fallback strategy, or the router choice require architecture, accessibility, and performance review.

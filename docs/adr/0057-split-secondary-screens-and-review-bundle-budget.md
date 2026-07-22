# ADR 0057: Split Secondary Screens And Review Bundle Budget

## Status

Accepted

## Context

Expanded pitch ranges and melody dictation pushed the single JavaScript and CSS assets beyond their existing budgets. The complete Pages output also reached 327.4 KiB raw, while remaining below the 100 KiB gzip network budget. Raising every limit would hide initial-load growth instead of controlling it.

## Decision

- Lazy-load the statistics panel and songs workspace because neither is needed for the initial practice screen.
- Move song-only styles into the songs chunk and remove the obsolete seven-button answer-grid CSS.
- Keep the JavaScript asset budget at 264 KiB and the CSS asset budget at 30 KiB raw / 6 KiB gzip.
- Increase only the total raw Pages-output budget from 320 KiB to 330 KiB to account for deferred screen chunks and their PWA precache entries.
- Keep the total gzip budget at 100 KiB.

## Consequences

- The initial practice JavaScript is 243.6 KiB raw and the initial CSS is 29.2 KiB raw after the split, both below their original limits.
- Statistics and song code load on first navigation to those screens, with an accessible loading status during the short transition.
- Future features still have to fit the unchanged per-asset and gzip limits; the total raw increase provides less than 3 KiB of remaining headroom.

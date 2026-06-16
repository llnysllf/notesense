# ADR 0050: Add Playwright Strict Port Contract

## Status

Accepted

## Context

NoteSense browser tests run against production preview servers. Most specialized Playwright configs already use explicit ports, and Vite preview configs use `--strictPort` so port conflicts fail immediately. The main browser workflow config expected `http://127.0.0.1:4173`, but its preview command did not pass an explicit strict port.

Without that contract, a local or CI port conflict could let the preview server choose a different port while Playwright still waits for `4173`. That makes failures slower and harder to diagnose.

## Decision

Update the main Playwright web server command to pass `--port 4173 --strictPort`.

Extend `npm run testing:check` so `scripts/check-testing-contracts.mjs` verifies each Playwright config keeps its preview command, `baseURL`, and web-server URL aligned. Vite preview configs must use `--strictPort`; the custom Pages preview server must keep its explicit port argument.

## Consequences

- Browser test server drift fails fast instead of becoming a confusing timeout.
- Future Playwright configs must choose an explicit port and keep it aligned across command, base URL, and readiness URL.
- The check remains lightweight and source-based; it complements actually running the browser suites.

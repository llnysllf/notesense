# Privacy And Data Handling

NoteSense is currently a static, local-first app. It does not require an account, and the practice loop does not send practice data to a server.

## Current Data Boundary

The app stores data in the learner's browser:

- Practice progress, note stats, pitch stats, and session history are saved in LocalStorage under `notesense.progress.v2`.
- Practice settings are saved in LocalStorage under `notesense.settings.v3`.
- Older local progress may be read from `notesense.progress.v1` and normalized into the current shape.
- Data stays on the current browser profile unless the learner exports it.
- The service worker cache stores reviewed static app assets only. It does not cache practice progress, exported data, or imported files.

## Export And Import

- Exported JSON files are created only when the learner chooses **Export data**.
- Exported files contain schema version, export timestamp, progress, history, and settings.
- Imported files are parsed in the browser and normalized before they replace local progress.
- Import parsing treats file contents as untrusted input and rejects unsupported schema versions.

## Network And Tracking

- No analytics, telemetry, advertising pixels, or third-party tracking scripts are included.
- `npm run runtime:check` rejects unreviewed client network APIs, cookies, telemetry beacons, websockets, and unapproved external URLs.
- The service worker is generated at build time for static offline use. It does not use background sync, push notifications, analytics, or custom runtime API caching.
- No microphone recording is used.
- Web Audio is used only for generated pitch playback in the browser.
- GitHub Pages serves the static app files; hosting access logs, if any, are controlled by GitHub rather than this app.

## Future Account Or Sync Work

Future sign-in, cloud sync, backend APIs, or hosted storage must be designed as explicit privacy-impacting changes. Those changes should:

- Preserve anonymous local practice as a usable baseline.
- Explain what data leaves the browser and why.
- Provide a migration path from local export data into an account.
- Add tests for sync, migration, auth, and data-retention behavior.
- Update this document, the security policy, architecture notes, and release checklist before shipping.

## Local Control

Learners can remove NoteSense data by using the app's reset control or by clearing site data for `llnysllf.github.io` in the browser.

Last reviewed: 2026-06-11

# Privacy And Data Handling

NoteSense is currently a static, local-first app. It does not require an account, and the practice loop does not send practice data to a server.

Security/privacy readiness expectations live in [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md).

## Current Data Boundary

The app stores data in the learner's browser:

- Practice progress, note stats, pitch stats, and session history are saved in LocalStorage under `notesense.progress.v2`.
- Practice settings are saved in LocalStorage under `notesense.settings.v3`.

Song practice results (best accuracy, completions, last played time) are saved in LocalStorage under `notesense.songProgress.v1`. They include selected drill ranges, including the custom piano span.

- Reading Score results are saved in LocalStorage under `notesense.readingScores.v1`, and an accepted placement result under `notesense.placement.v1`. Neither contains a name, an account, or a device identifier.
- A Reading Score share card is drawn on a canvas in the page and saved to the device only when the learner asks for it. It is never uploaded, and it carries the result and the date only — no identifier and no time of day.
- Singing exercises use the microphone only while a take is running, and only after the learner presses record. Permission is never requested on load.
- **No audio is recorded, stored, or transmitted.** Samples are read from the microphone, converted to a pitch estimate, and the buffer is immediately reused. Pitch frames and the derived contour live only for the length of a take and are discarded when it ends. What can be kept is a `SungSummary` — five derived numbers describing how close the singing was — and the learner's comfortable range under `notesense.vocalRange.v1`.
- Echo cancellation, noise suppression, and automatic gain are requested off, because they are tuned for speech and would bend the pitch being measured. This does not change what is stored.
- The microphone is released when a take ends or the screen is left, which is what turns the browser's recording indicator off.
- Older local progress may be read from `notesense.progress.v1` and normalized into the current shape.
- Data stays on the current browser profile unless the learner exports it.
- The service worker cache stores reviewed static app assets only. It does not cache practice progress, exported data, or imported files.

## Export And Import

- Exported JSON files are created only when the learner chooses **Export data**.
- Export schema version is currently `2`.
- Exported files contain schema version, export timestamp, progress, history, settings, and the learner's structured attempt evidence; raw audio and microphone frames are never exported.
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

Future localization must not introduce remote translation services, locale analytics, cookies, or third-party scripts without privacy, security, runtime-surface, and release review.

## Local Control

Learners can remove NoteSense data by using the app's reset control or by clearing site data for `llnysllf.github.io` in the browser.

Last reviewed: 2026-06-15

# Security Policy

NoteSense is currently a static, local-first web app. It does not store data on a server, and saved progress stays in the user's browser unless the user exports it.

## Supported Version

The `main` branch and the GitHub Pages deployment are the supported version.

## Reporting a Vulnerability

Please avoid posting exploit details publicly. Contact the repository owner through GitHub and ask for a private disclosure channel, or open a minimal public issue that says a security report is available without including sensitive details.

Useful details include:

- Affected URL or feature area.
- Browser and operating system.
- Reproduction steps.
- Impact and whether user data, exported files, audio permissions, or browser storage are involved.

## Security Expectations

- Do not introduce secrets into the repository.
- Keep `.env` and local environment files ignored.
- Run `npm run compliance:licenses` before release so dependency-license drift is caught.
- Run `npm run verify` before release so high-severity dependency advisories are caught.
- Treat CodeQL findings as release-blocking unless they are reviewed and explicitly accepted.
- Treat import/export parsing as an untrusted input boundary.
- Treat future account, sync, and backend features as security-sensitive changes requiring tests and review.

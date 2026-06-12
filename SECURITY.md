# Security Policy

NoteSense is currently a static, local-first web app. It does not store data on a server, and saved progress stays in the user's browser unless the user exports it.

Privacy and data handling expectations live in [docs/PRIVACY.md](docs/PRIVACY.md). Future account, sync, and backend work should also follow [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) and [docs/BACKEND_READINESS.md](docs/BACKEND_READINESS.md).

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
- Keep GitHub Actions pinned to reviewed commit SHAs with least-privilege token permissions; run `npm run security:workflows` after workflow edits.
- Keep `package-lock.json` committed from the pinned npm runtime; run `npm run security:lockfile` after dependency or runtime changes.
- Run `npm run compliance:licenses` before release so dependency-license drift is caught.
- Run `npm run security:policy` after a Pages build when HTML shell, Vite build, runtime API, or asset-category behavior changes.
- Run `npm run verify` before release so supply-chain policy, high-severity dependency advisories, and release gates are caught.
- Run `npm run ops:repository` after repository security, branch protection, required-check, Pages, or workflow-activation changes.
- Treat CodeQL findings as release-blocking unless they are reviewed and explicitly accepted.
- Treat Dependency Review failures as release-blocking for pull requests that change dependencies.
- Treat import/export parsing as an untrusted input boundary.
- Treat future account, sync, and backend features as security-sensitive changes requiring tests and review.
- Do not connect the browser app directly to a database; future persistence must go through a reviewed backend API.

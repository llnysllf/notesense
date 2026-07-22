# Review And Intake Contract

NoteSense is small, but changes should still enter the project through a clear path. This contract keeps bugs, product ideas, engineering work, security reports, ownership, and pull-request review evidence consistent while the foundation is being strengthened.

Product-learning expectations live in [PRODUCT_LEARNING.md](PRODUCT_LEARNING.md).

## Ownership

- `.github/CODEOWNERS` owns default review routing.
- NoteSense has a single maintainer, so pull requests do not require an approving reviewer or CODEOWNERS approval before merge.
- Every pull request still needs the protected quality and security checks to pass; contributors should keep changes reviewable even when a second reviewer is not required.
- Ownership changes should update repository governance docs and `npm run ops:repository` expectations when branch protection or review behavior changes.

## Intake Paths

- Support expectations and non-SLA boundaries live in [../.github/SUPPORT.md](../.github/SUPPORT.md).
- Bug reports use `.github/ISSUE_TEMPLATE/bug_report.yml`.
- Product proposals use `.github/ISSUE_TEMPLATE/feature_proposal.yml`.
- Engineering tasks use `.github/ISSUE_TEMPLATE/engineering_task.yml`.
- Public blank issues stay disabled so incoming work has enough structure.
- Security reports follow `SECURITY.md` instead of public issue details.

## Triage Rules

- Bugs should include area, current behavior, expected behavior, reproduction steps, browser or viewport context, and evidence when available.
- Product proposals should start with learner problem and desired outcome before implementation details.
- Product proposals should include the intended learning signal before implementation.
- Engineering tasks should state the quality bar being raised, acceptance evidence, and risk notes.
- Feature proposals that expand current scope should update `docs/PRODUCT_SCOPE.md` before implementation starts.
- Support requests should avoid private LocalStorage exports, imported files, raw practice history, credentials, `.env` files, and screenshots that expose private data.
- Security-sensitive work should follow `SECURITY.md`, `docs/THREAT_MODEL.md`, and `docs/BACKEND_READINESS.md`.

## Pull Request Evidence

Every PR should include:

- a concise summary
- relevant local validation, preferably `npm run verify` for release-ready work
- product-scope, accessibility, testing, ADR, data, privacy, security, operations, dependency, workflow, bundle, Pages, and visual-regression impact notes when relevant
- screenshots or visual-regression evidence when UI intentionally changes
- risk notes for migrations, deployment, privacy, security, accessibility, or future backend boundaries

## Change Rules

- Update this contract when CODEOWNERS, support policy, issue templates, PR template, review routing, triage labels, security-report routing, or review evidence expectations change.
- Run `npm run review:check` after review, support-policy, intake, issue-template, PR-template, CODEOWNERS, or triage-process changes.
- Keep product-scope, quality, release, operations, security, and repository-governance docs aligned when the review process changes.

## Verification

`npm run review:check` verifies that:

- CODEOWNERS still routes default ownership
- support expectations, non-SLA boundaries, privacy guidance, and issue routing stay documented
- bug, product proposal, and engineering task templates keep required labels and evidence fields
- blank public issues stay disabled and security reports route through the security policy
- the pull request template keeps summary, quality checklist, risk notes, validation, and foundation-impact prompts
- README, contributing, quality, release, architecture, operations, product-scope, testing, and ADR docs stay connected to review and intake governance

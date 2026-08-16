# ADR 0074: A Public Site Whose Claims Are Generated From The Product

## Status

Accepted

## Context

Fourteen slices in, NoteSense had no public face. The root URL opened Today, which is the right screen for someone
who already practices here and a confusing one for someone who has never heard of it. Nothing explained what the
product was, and nothing let a visitor try it before committing.

The obvious way to build a marketing site is to write copy next to the app. That is also the way every marketing
site ends up lying: the copy is written once, the product changes weekly, and nobody re-reads the home page. By
slice fifteen the project already had a concrete example of this failure mode — `docs/PRODUCT_SCOPE.md` still listed
"MIDI file upload, MIDI device input, timed rhythm scoring" as explicitly out of scope, four slices after all three
shipped. A page a visitor reads deserves at least the protection the contract gates give everything else.

The roadmap also asks this slice to capture demand and measure conversion. Both require something the project does
not have and has deliberately not built: a network request. `npm run runtime:check` bans `fetch(`, the content
policy sets `connect-src 'none'`, and the roadmap's own wording defers measurement to a reviewed, consented,
first-party path that does not exist yet.

## Decision

**Claims are data, checked against the shipped route table.** `shared/src/marketing/capability.ts` describes what
the product does in the words a page may print, and each capability names the destination a visitor uses to do it.
`validateMarketingPages` fails when a page claims a capability whose route is not in `ROUTES`, when a primary action
points nowhere, or when a title or description would be truncated in a search result. A test removes singing from
the route table and asserts the singing page becomes an error. Deleting a screen therefore breaks the build rather
than leaving a promise on the site.

**One thing to do per page.** A page carries exactly one `primaryAction`, and the validator enforces it. Pages with
three equal calls to action are pages that have not decided what they are for.

**The demo is the product.** The home page runs the app's own `selectReadingNote` and draws the app's own
`MusicStaff`. A screenshot would load faster and would be a claim rather than a demonstration. Nothing it does is
saved: a demo that wrote to the practice record would corrupt the evidence the whole app is built on, and a visitor
has agreed to nothing.

**Pages that would be lies are absent by construction.** There is no Pricing page because there is no offer, and no
Sign-in page because there are no accounts. A test asserts both paths stay absent, so adding either means adding the
thing first.

**No demand capture, and no measurement.** A waitlist means collecting email addresses, which means a request, an
endpoint, a widened content policy, and a privacy policy that covers personal data. Those are the project owner's
decisions, and the roadmap already routes measurement through a consented path that has not been built. The single
conversion action is therefore "start practising", which needs no network and no consent. The consequence is stated
plainly below: this slice cannot satisfy its own product-evidence gate.

**Public pages are prerendered; the app is lazy.** A single-page app has one `<head>`, so without prerendering every
public URL would return the home page's title and description — which is exactly what a crawler, a link preview, and
a browser tab read. The build emits one small HTML file per public page, with its own title, description, canonical,
and Open Graph tags, and generates the sitemap from the same data. Conversely the practice app now sits behind a
lazy import, so a first visit loads the page and nothing else.

## Consequences

- The site cannot drift ahead of the product without failing a test. It can still drift behind one — a shipped
  feature with no capability entry is invisible rather than untrue, which is the safer direction.
- The root URL is the public home page. The app's own home is `/today`, and the deployed Pages smoke test now proves
  the public site boots and leads into the app.
- `docs/PRODUCT_SCOPE.md` was rewritten to match what actually ships. It had drifted across four slices, and a
  marketing site cannot be checked against a scope document that contradicts the app.
- The total and CSS bundle budgets rose for the public surface. The practice route did not get bigger; a first visit
  got smaller.
- The runtime-surface gate now checks every emitted HTML file rather than only the shell, and treats the site's own
  canonical URLs as self-references. A single outbound link to the project's public repository was allowlisted: a
  link is not a request.
- **The product-evidence gate for this slice is deliberately left open.** Measuring visitor-to-practice conversion
  needs numbers the project cannot currently get: production is served from GitHub Pages, which gives the owner no
  request logs, so any measurement means either moving hosting or building a consented first-party endpoint — a
  widened content policy, a hosted privacy policy, and a backend that does not exist. Both options were put to the
  owner, who chose to leave the gate open rather than change the project's privacy posture for it. The site ships
  unmeasured on the argument that no public face at all is worse than an unmeasured one, and the gate reopens with
  the reviewed, consented measurement path the roadmap already schedules for a later slice. This is a decision, not
  an oversight; the alternatives and their costs are recorded here so it does not have to be rediscovered.

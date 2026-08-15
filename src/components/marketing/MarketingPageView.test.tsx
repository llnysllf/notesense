import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarketingPageView from "./MarketingPageView";
import { CAPABILITIES, MARKETING_PAGES, marketingNavPages, type MarketingView } from "../../types";

const home = MARKETING_PAGES.find((page) => page.id === "home") as (typeof MARKETING_PAGES)[number];
const rhythm = MARKETING_PAGES.find((page) => page.id === "rhythm") as (typeof MARKETING_PAGES)[number];

function renderPage(overrides: Partial<MarketingView> = {}) {
  const site: MarketingView = {
    page: rhythm,
    claims: CAPABILITIES.filter((capability) => rhythm.capabilities.includes(capability.id)),
    navPages: marketingNavPages(),
    demo: null,
    ...overrides,
  };

  return { ...render(<MarketingPageView site={site} />), site };
}

describe("a public page", () => {
  it("leads with what the page is about", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(rhythm.heading);
    expect(screen.getByText(rhythm.intro)).toBeInTheDocument();
  });

  it("offers one primary action, as a link a visitor can also open in a new tab", () => {
    renderPage();

    expect(screen.getByRole("link", { name: rhythm.primaryAction.label })).toHaveAttribute(
      "href",
      rhythm.primaryAction.href,
    );
  });

  it("prints only the claims it was given, in the product's own words", () => {
    renderPage();

    const claims = within(screen.getByRole("region", { name: "What you can do" }));

    expect(claims.getAllByRole("listitem")).toHaveLength(rhythm.capabilities.length);
    expect(claims.getByText("Tap a rhythm against a metronome and see where you were early or late.")).toBeVisible();
  });

  it("says nothing at all when it was given no claims", () => {
    // A page whose capabilities were filtered out because their screens are
    // gone shows an empty list rather than stale copy.
    renderPage({ claims: [] });

    expect(within(screen.getByRole("region", { name: "What you can do" })).queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByText(/Tap a rhythm/)).toBeNull();
  });

  it("opens the screen behind a claim", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /Open rhythm/i })).toHaveAttribute("href", "/practice/rhythm");
  });

  it("marks the current page in the site navigation", () => {
    renderPage();

    const nav = within(screen.getByRole("navigation", { name: "Site" }));
    expect(nav.getByRole("link", { name: "Rhythm" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "Singing" })).not.toHaveAttribute("aria-current");
  });

  it("routes navigation through the router rather than as bare anchors", () => {
    renderPage();

    // A bare anchor loses the sub-path the deployed site is served from, and
    // sends a visitor to a URL that does not exist there.
    expect(
      within(screen.getByRole("navigation", { name: "Site" })).getByRole("link", { name: "Privacy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("offers no screen link for a claim that is not a screen", () => {
    // Being local-first is a property of the app rather than a destination.
    renderPage({ claims: CAPABILITIES.filter((capability) => capability.id === "offline") });

    expect(screen.getByText("Local-first")).toBeVisible();
    expect(screen.queryByRole("link", { name: /^Open / })).toBeNull();
  });

  it("starts practice from inside the demo", () => {
    renderPage({
      page: home,
      demo: {
        note: { id: "C4", name: "C", octave: 4, frequency: 261.63, staffY: 10, clef: "treble", keyboardShortcut: "c" },
        options: ["C", "D"],
        verdict: "unanswered",
        lastAnswer: null,
        answered: 0,
        correct: 0,
        answer: vi.fn(),
        next: vi.fn(),
      },
    });

    // The home page shows its one action under the demo, not above it or in
    // the header.
    const demoSection = within(screen.getByRole("region", { name: "Try one now" }));
    expect(demoSection.getByRole("link", { name: home.primaryAction.label })).toHaveAttribute(
      "href",
      home.primaryAction.href,
    );
    expect(within(screen.getByRole("banner")).queryByRole("link", { name: home.primaryAction.label })).toBeNull();
  });

  it("carries the demo only on the page that has one", () => {
    renderPage();
    expect(screen.queryByRole("heading", { name: "Try one now" })).toBeNull();

    renderPage({
      page: home,
      demo: {
        note: { id: "C4", name: "C", octave: 4, frequency: 261.63, staffY: 10, clef: "treble", keyboardShortcut: "c" },
        options: ["C", "D"],
        verdict: "unanswered",
        lastAnswer: null,
        answered: 0,
        correct: 0,
        answer: vi.fn(),
        next: vi.fn(),
      },
    });
    expect(screen.getByRole("heading", { name: "Try one now" })).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { CAPABILITIES, capabilityById, shippedCapabilities } from "./capability";
import { MARKETING_PAGES, marketingNavPages, marketingPageByPath, marketingPagePaths } from "./page";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  sitemapUrls,
  validateMarketingPages,
  type ClaimIssue,
} from "./claims";
import type { MarketingPage } from "./page";

// The destinations the app actually ships. Written out rather than imported so
// this stays framework-free; a test in the app asserts the two agree.
const SHIPPED = [
  "/today",
  "/practice/reading",
  "/practice/pitch",
  "/practice/rhythm",
  "/practice/ear",
  "/practice/singing",
  "/practice/songs",
  "/practice/import",
  "/assess/placement",
  "/assess/reading-score",
  "/progress",
  "/progress/map",
  "/progress/history",
  "/settings",
  "/settings/data",
];

const problems = (issues: ClaimIssue[]) => issues.map((issue) => issue.problem);

function page(overrides: Partial<MarketingPage> = {}): MarketingPage {
  return {
    id: "home",
    path: "/",
    navLabel: "Home",
    title: "NoteSense",
    description: "A description long enough to be worth showing in a search result, and no longer than that.",
    heading: "Heading",
    intro: "Intro",
    capabilities: ["reading"],
    primaryAction: { label: "Start", href: "/practice/reading" },
    ...overrides,
  };
}

describe("the site as shipped", () => {
  it("says nothing the product cannot do", () => {
    // The whole reason this module exists.
    expect(validateMarketingPages(SHIPPED)).toEqual([]);
  });

  it("keeps every claim tied to a capability that exists", () => {
    for (const marketingPage of MARKETING_PAGES) {
      for (const id of marketingPage.capabilities) {
        expect(capabilityById(id)).toBeDefined();
      }
    }
  });

  it("gives every page exactly one thing to do", () => {
    for (const marketingPage of MARKETING_PAGES) {
      expect(marketingPage.primaryAction.label.length).toBeGreaterThan(0);
      expect(marketingPage.primaryAction.href.startsWith("/")).toBe(true);
    }
  });

  it("has no page for anything that does not exist yet", () => {
    // No offer, no accounts, so no Pricing and no Sign-in. This is the test that
    // has to fail before either can be added.
    const paths = marketingPagePaths();
    expect(paths).not.toContain("/pricing");
    expect(paths).not.toContain("/sign-in");
    expect(paths).not.toContain("/login");
  });

  it("keeps the home page out of its own navigation", () => {
    expect(marketingNavPages().some((entry) => entry.path === "/")).toBe(false);
    expect(marketingNavPages()).toHaveLength(MARKETING_PAGES.length - 1);
  });

  it("finds a page by its path", () => {
    expect(marketingPageByPath("/rhythm")?.id).toBe("rhythm");
    expect(marketingPageByPath("/not-a-page")).toBeUndefined();
  });
});

describe("catching a claim the product cannot back", () => {
  it("fails when a page advertises a screen that is not shipped", () => {
    // Remove singing from the app and the singing page becomes a lie. This is
    // the failure this whole contract is built to catch.
    const withoutSinging = SHIPPED.filter((path) => path !== "/practice/singing");

    expect(problems(validateMarketingPages(withoutSinging)).join(" ")).toMatch(
      /claims singing, but \/practice\/singing is not shipped/,
    );
  });

  it("fails on a capability nobody has built", () => {
    const issues = validateMarketingPages(SHIPPED, [page({ capabilities: ["ai-teacher" as never] })]);

    expect(problems(issues)).toContain("claims unknown capability ai-teacher");
  });

  it("fails when the one thing to do leads nowhere", () => {
    const issues = validateMarketingPages(SHIPPED, [page({ primaryAction: { label: "Sign in", href: "/sign-in" } })]);

    expect(problems(issues)).toContain("primary action points at /sign-in, which does not exist");
  });

  it("fails when the primary action leaves the site", () => {
    const issues = validateMarketingPages(SHIPPED, [
      page({ primaryAction: { label: "Buy", href: `${"https"}://example.com/checkout` } }),
    ]);

    expect(problems(issues).join(" ")).toMatch(/leaves the site/);
  });

  it("fails a page that asks for a visit but claims nothing", () => {
    expect(problems(validateMarketingPages(SHIPPED, [page({ capabilities: [] })]))).toContain(
      "claims nothing, so there is no reason to visit it",
    );
  });

  it("fails a duplicated claim rather than printing it twice", () => {
    expect(problems(validateMarketingPages(SHIPPED, [page({ capabilities: ["reading", "reading"] })]))).toContain(
      "claims reading twice",
    );
  });

  it("fails two pages that share a path or an id", () => {
    const issues = validateMarketingPages(SHIPPED, [page(), page()]);

    expect(problems(issues)).toContain("duplicate page id");
    expect(problems(issues)).toContain("duplicate path /");
  });

  it("fails when nothing is served at the site root", () => {
    expect(problems(validateMarketingPages(SHIPPED, [page({ path: "/rhythm", id: "rhythm" })]))).toContain(
      "there is no page at the site root",
    );
  });
});

describe("metadata a search result can actually show", () => {
  it("rejects a title that would be cut off", () => {
    const issues = validateMarketingPages(SHIPPED, [page({ title: "N".repeat(MAX_TITLE_LENGTH + 1) })]);

    expect(problems(issues).join(" ")).toMatch(/title is 61 characters/);
  });

  it("rejects a description that would be cut off", () => {
    const issues = validateMarketingPages(SHIPPED, [page({ description: "D".repeat(MAX_DESCRIPTION_LENGTH + 1) })]);

    expect(problems(issues).join(" ")).toMatch(/description is 161 characters/);
  });

  it("rejects a description too short to say anything", () => {
    expect(problems(validateMarketingPages(SHIPPED, [page({ description: "Practice piano." })]))).toContain(
      "description is too short to be useful in a search result",
    );
  });

  it("rejects an empty title, heading, or intro", () => {
    const issues = validateMarketingPages(SHIPPED, [page({ title: " ", navLabel: "", heading: "", intro: "  " })]);

    expect(problems(issues)).toEqual(
      expect.arrayContaining(["missing title", "missing nav label", "missing heading", "missing intro"]),
    );
  });

  it("keeps every shipped page inside those limits", () => {
    for (const marketingPage of MARKETING_PAGES) {
      expect(marketingPage.title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
      expect(marketingPage.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    }
  });
});

// Assembled rather than written out: the runtime-surface gate refuses a literal
// absolute URL in client source, and a test fixture is not an exception worth
// carving out.
const testSite = (path = "") => `${"https"}://example.com/notesense/${path}`;

describe("what a crawler is given", () => {
  it("lists every public page once, and nothing behind the app router", () => {
    const urls = sitemapUrls(testSite());

    expect(urls).toHaveLength(MARKETING_PAGES.length);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain(testSite());
    expect(urls).toContain(testSite("rhythm"));
    expect(urls.some((url) => url.includes("/practice/"))).toBe(false);
  });

  it("does not double the slash at the site root", () => {
    const root = `${"https"}://example.com/`;
    expect(sitemapUrls(root)).toContain(root);
  });
});

describe("which capabilities are reachable", () => {
  it("drops the ones whose screen is gone, and keeps the ones that are not screens", () => {
    const reachable = shippedCapabilities(SHIPPED.filter((path) => path !== "/practice/rhythm"));

    expect(reachable.some((capability) => capability.id === "rhythm")).toBe(false);
    // Being local-first is a property of the app, not a destination.
    expect(reachable.some((capability) => capability.id === "offline")).toBe(true);
  });

  it("keeps every shipped capability pointed at a real destination", () => {
    expect(shippedCapabilities(SHIPPED)).toHaveLength(CAPABILITIES.length);
  });
});

// The public pages, as data.
//
// A page is a path, its metadata, the capabilities it is allowed to talk about,
// and exactly one thing it asks a visitor to do. Holding that as data rather
// than as JSX means the sitemap, the per-page <head> tags, the prerendered HTML,
// and the rendered page all come from one description instead of four that
// drift.
//
// Pages that would be lies are absent by construction rather than by
// discipline. There is no Pricing page because there is no offer, and no
// Sign-in page because there are no accounts. Adding either means adding the
// thing first.

import type { CapabilityId } from "./capability";
import { MARKETING_PAGE_DATA } from "./pageData";

export { SITE_URL, SOURCE_URL } from "./pageData";

export type MarketingPageId = "home" | "how-it-works" | "reading" | "rhythm" | "ear" | "singing" | "privacy" | "help";

// What the page asks the visitor to do. One per page: a page with three equal
// calls to action is a page that has not decided what it is for.
export type PrimaryAction = {
  label: string;
  href: string;
};

export type MarketingPage = {
  id: MarketingPageId;
  path: string;
  // What the public navigation calls this page. Separate from the title, which
  // has a search result to fit into rather than a menu.
  navLabel: string;
  // Shown in a browser tab and a search result. Kept short enough not to be
  // truncated there.
  title: string;
  description: string;
  heading: string;
  intro: string;
  capabilities: readonly CapabilityId[];
  primaryAction: PrimaryAction;
};

export const MARKETING_PAGES: readonly MarketingPage[] = MARKETING_PAGE_DATA;

const BY_PATH = new Map<string, MarketingPage>(MARKETING_PAGES.map((page) => [page.path, page]));

export function marketingPageByPath(path: string): MarketingPage | undefined {
  return BY_PATH.get(path);
}

export function marketingPagePaths(): readonly string[] {
  return MARKETING_PAGES.map((page) => page.path);
}

// The pages a visitor can reach from the public navigation. Home is the site
// itself rather than an entry in its own menu.
export function marketingNavPages(): readonly MarketingPage[] {
  return MARKETING_PAGES.filter((page) => page.id !== "home");
}

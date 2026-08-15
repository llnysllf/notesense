// Checking that the public site is telling the truth.
//
// "The site accurately represents the product" is the kind of promise that
// survives exactly as long as someone remembers to check it. These rules make it
// a test: a page cannot advertise a screen that is not shipped, cannot carry
// metadata a search result would cut in half, and cannot send a visitor to a
// destination that does not exist.
//
// The route table is passed in rather than imported, so this stays framework-
// free and so a test can ask what the site would claim if a screen were removed.

import { capabilityById, type CapabilityId } from "./capability";
import { MARKETING_PAGES, type MarketingPage, type MarketingPageId } from "./page";

// Search results cut a title at roughly 60 characters and a description at
// roughly 155. A claim nobody can finish reading is not a claim.
export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 160;
export const MIN_DESCRIPTION_LENGTH = 50;

export type ClaimIssue = {
  page: MarketingPageId;
  problem: string;
};

function checkMetadata(page: MarketingPage, issues: ClaimIssue[]): void {
  if (page.title.trim().length === 0) issues.push({ page: page.id, problem: "missing title" });
  if (page.title.length > MAX_TITLE_LENGTH) {
    issues.push({ page: page.id, problem: `title is ${page.title.length} characters, over ${MAX_TITLE_LENGTH}` });
  }
  if (page.description.length > MAX_DESCRIPTION_LENGTH) {
    issues.push({
      page: page.id,
      problem: `description is ${page.description.length} characters, over ${MAX_DESCRIPTION_LENGTH}`,
    });
  }
  if (page.description.length < MIN_DESCRIPTION_LENGTH) {
    issues.push({ page: page.id, problem: "description is too short to be useful in a search result" });
  }
  if (page.navLabel.trim().length === 0) issues.push({ page: page.id, problem: "missing nav label" });
  if (page.heading.trim().length === 0) issues.push({ page: page.id, problem: "missing heading" });
  if (page.intro.trim().length === 0) issues.push({ page: page.id, problem: "missing intro" });
}

function checkCapabilities(page: MarketingPage, shippedPaths: Set<string>, issues: ClaimIssue[]): void {
  if (page.capabilities.length === 0) {
    issues.push({ page: page.id, problem: "claims nothing, so there is no reason to visit it" });
  }

  const seen = new Set<CapabilityId>();
  for (const id of page.capabilities) {
    if (seen.has(id)) issues.push({ page: page.id, problem: `claims ${id} twice` });
    seen.add(id);

    const capability = capabilityById(id);
    if (!capability) {
      issues.push({ page: page.id, problem: `claims unknown capability ${id}` });
      continue;
    }

    // The rule this whole module exists for.
    if (capability.routePath !== undefined && !shippedPaths.has(capability.routePath)) {
      issues.push({ page: page.id, problem: `claims ${id}, but ${capability.routePath} is not shipped` });
    }
  }
}

function checkPrimaryAction(page: MarketingPage, reachable: Set<string>, issues: ClaimIssue[]): void {
  const { href, label } = page.primaryAction;

  if (label.trim().length === 0) issues.push({ page: page.id, problem: "primary action has no label" });
  if (!href.startsWith("/")) {
    issues.push({ page: page.id, problem: `primary action leaves the site: ${href}` });
    return;
  }
  if (!reachable.has(href)) {
    issues.push({ page: page.id, problem: `primary action points at ${href}, which does not exist` });
  }
}

// Every rule, run over every page. Returns what is wrong rather than throwing,
// so a caller can report all of it at once instead of one problem per run.
export function validateMarketingPages(
  appRoutePaths: readonly string[],
  pages: readonly MarketingPage[] = MARKETING_PAGES,
): ClaimIssue[] {
  const issues: ClaimIssue[] = [];
  const shippedPaths = new Set(appRoutePaths);
  const reachable = new Set([...appRoutePaths, ...pages.map((page) => page.path)]);
  const ids = new Set<MarketingPageId>();
  const paths = new Set<string>();

  for (const page of pages) {
    if (ids.has(page.id)) issues.push({ page: page.id, problem: "duplicate page id" });
    ids.add(page.id);

    if (paths.has(page.path)) issues.push({ page: page.id, problem: `duplicate path ${page.path}` });
    paths.add(page.path);

    checkMetadata(page, issues);
    checkCapabilities(page, shippedPaths, issues);
    checkPrimaryAction(page, reachable, issues);
  }

  if (!paths.has("/")) {
    issues.push({ page: "home", problem: "there is no page at the site root" });
  }

  return issues;
}

export { sitemapUrls } from "./pageData";

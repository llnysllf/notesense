import { useEffect } from "react";
import type { MarketingPage } from "../types";

// Keeps the document head in step with the page being shown.
//
// The prerendered HTML already carries the right tags for a direct load, which
// is what a crawler or a shared link sees. This is for the other half: once the
// client router takes over, moving between pages must not leave the previous
// page's title in the tab or the previous page's URL in the canonical link.
//
// Only tags that already exist in the shell are updated. Creating them here
// would mean the prerender and the runtime could disagree about which tags a
// page has, and the prerender is the one crawlers read.
function setMeta(selector: string, attribute: string, value: string): void {
  const element = document.head.querySelector(selector);
  element?.setAttribute(attribute, value);
}

export function usePageMetadata(page: MarketingPage, siteUrl: string): void {
  useEffect(() => {
    const canonical = page.path === "/" ? siteUrl : `${siteUrl.replace(/\/+$/, "")}${page.path}`;

    document.title = page.title;
    setMeta('meta[name="description"]', "content", page.description);
    setMeta('meta[property="og:title"]', "content", page.title);
    setMeta('meta[property="og:description"]', "content", page.description);
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('meta[name="twitter:title"]', "content", page.title);
    setMeta('meta[name="twitter:description"]', "content", page.description);
    setMeta('link[rel="canonical"]', "href", canonical);
  }, [page, siteUrl]);
}

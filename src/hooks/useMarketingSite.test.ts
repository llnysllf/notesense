import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("raviger", () => ({ navigate: (path: string) => navigate(path) }));
import { useMarketingSite } from "./useMarketingSite";
import { ROUTES } from "../routes";
import { MARKETING_PAGES, validateMarketingPages, type MarketingPage } from "../types";

const pageById = (id: MarketingPage["id"]) => MARKETING_PAGES.find((page) => page.id === id) as MarketingPage;

describe("assembling a public page", () => {
  it("checks every shipped claim against the app's real route table", () => {
    // The contract is only worth having if it is run against the routes the app
    // actually has, rather than a list written next to it.
    expect(validateMarketingPages(ROUTES.map((route) => route.path))).toEqual([]);
  });

  it("turns a page's capability ids into the capabilities themselves", () => {
    const { result } = renderHook(() => useMarketingSite(pageById("rhythm")));

    expect(result.current.claims.map((capability) => capability.id)).toEqual(pageById("rhythm").capabilities);
    expect(result.current.claims[0]?.claim.length).toBeGreaterThan(0);
  });

  it("carries the demo on the home page and nowhere else", () => {
    expect(renderHook(() => useMarketingSite(pageById("home"))).result.current.demo).not.toBeNull();
    expect(renderHook(() => useMarketingSite(pageById("privacy"))).result.current.demo).toBeNull();
  });

  it("keeps the home page out of the navigation it hands to the shell", () => {
    const { result } = renderHook(() => useMarketingSite(pageById("home")));

    expect(result.current.navPages.some((entry) => entry.id === "home")).toBe(false);
  });

  it("moves through the router rather than reloading the page", () => {
    const { result } = renderHook(() => useMarketingSite(pageById("home")));

    act(() => result.current.onNavigate("/practice/ear"));

    expect(navigate).toHaveBeenCalledWith("/practice/ear");
  });

  it("never offers a claim whose screen the app does not have", () => {
    // Every page, not only the one under test: a claim is allowed through only
    // when its destination is in ROUTES.
    const shipped = new Set(ROUTES.map((route) => route.path));

    for (const page of MARKETING_PAGES) {
      const { result } = renderHook(() => useMarketingSite(page));
      for (const capability of result.current.claims) {
        if (capability.routePath) expect(shipped.has(capability.routePath)).toBe(true);
      }
    }
  });
});

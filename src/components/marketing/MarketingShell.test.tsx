import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarketingShell from "./MarketingShell";
import { MARKETING_PAGES, SOURCE_URL, marketingNavPages, type MarketingPage } from "../../types";

const home = MARKETING_PAGES.find((page) => page.id === "home") as MarketingPage;

function renderShell(page: MarketingPage = home) {
  return render(
    <MarketingShell page={page} navPages={marketingNavPages()}>
      <p>page body</p>
    </MarketingShell>,
  );
}

describe("the frame around every public page", () => {
  it("renders the page inside it", () => {
    renderShell();

    expect(screen.getByText("page body")).toBeVisible();
  });

  it("goes home from the wordmark", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "NoteSense" })).toHaveAttribute("href", "/");
  });

  it("keeps one way into the app in the header, on every page", () => {
    renderShell(MARKETING_PAGES[3] as MarketingPage);

    expect(screen.getByRole("link", { name: "Start practising" })).toHaveAttribute("href", "/practice/reading");
  });

  it("lists every public page except the one it is the front of", () => {
    renderShell();

    const nav = within(screen.getByRole("navigation", { name: "Site" }));
    expect(nav.getAllByRole("link")).toHaveLength(MARKETING_PAGES.length - 1);
    expect(nav.queryByRole("link", { name: "Home" })).toBeNull();
  });

  it("routes footer links through the router too", () => {
    renderShell();
    const footer = within(screen.getByRole("contentinfo"));

    expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(footer.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
  });

  it("says what the product does not do, where a visitor will read it", () => {
    renderShell();

    expect(screen.getByRole("contentinfo")).toHaveTextContent(/No account, no servers, no tracking/);
  });

  it("links out to the source rather than only claiming to be open", () => {
    renderShell();

    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Source" })).toHaveAttribute(
      "href",
      SOURCE_URL,
    );
  });
});

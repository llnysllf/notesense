import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarketingShell from "./MarketingShell";
import { MARKETING_PAGES, SOURCE_URL, marketingNavPages, type MarketingPage } from "../../types";

const home = MARKETING_PAGES.find((page) => page.id === "home") as MarketingPage;

function renderShell(page: MarketingPage = home) {
  const onNavigate = vi.fn();

  render(
    <MarketingShell page={page} navPages={marketingNavPages()} onNavigate={onNavigate}>
      <p>page body</p>
    </MarketingShell>,
  );

  return { onNavigate };
}

describe("the frame around every public page", () => {
  it("renders the page inside it", () => {
    renderShell();

    expect(screen.getByText("page body")).toBeVisible();
  });

  it("goes home from the wordmark without a page load", () => {
    const { onNavigate } = renderShell();

    fireEvent.click(screen.getByRole("link", { name: "NoteSense" }));

    expect(onNavigate).toHaveBeenCalledWith("/");
  });

  it("keeps one way into the app in the header, on every page", () => {
    const { onNavigate } = renderShell(MARKETING_PAGES[3] as MarketingPage);

    fireEvent.click(screen.getAllByRole("link", { name: "Start practising" })[0] as HTMLElement);

    expect(onNavigate).toHaveBeenCalledWith("/practice/reading");
  });

  it("lists every public page except the one it is the front of", () => {
    renderShell();

    const nav = within(screen.getByRole("navigation", { name: "Site" }));
    expect(nav.getAllByRole("link")).toHaveLength(MARKETING_PAGES.length - 1);
    expect(nav.queryByRole("link", { name: "Home" })).toBeNull();
  });

  it("routes footer links through the app too", () => {
    const { onNavigate } = renderShell();
    const footer = within(screen.getByRole("contentinfo"));

    fireEvent.click(footer.getByRole("link", { name: "Privacy" }));
    fireEvent.click(footer.getByRole("link", { name: "Help" }));

    expect(onNavigate).toHaveBeenCalledWith("/privacy");
    expect(onNavigate).toHaveBeenCalledWith("/help");
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

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Site from "./Site";

vi.mock("./App", () => ({ default: () => <div data-testid="practice-app" /> }));

// The shell ships these tags; the hook updates them rather than creating them,
// so a prerendered page and the client router cannot end up with two of each.
// The test document has to start where a real one does.
const SHELL_TAGS = [
  '<meta name="description" content="shell" />',
  '<meta property="og:title" content="shell" />',
  '<meta property="og:description" content="shell" />',
  '<meta property="og:url" content="shell" />',
  '<meta name="twitter:title" content="shell" />',
  '<meta name="twitter:description" content="shell" />',
  '<link rel="canonical" href="shell" />',
].join("");

beforeEach(() => {
  document.head.innerHTML = SHELL_TAGS;
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
  document.head.innerHTML = "";
});

function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  return render(<Site />);
}

describe("which of the two things a URL is", () => {
  it("serves the public home page at the site root", async () => {
    renderAt("/");

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Practice reading music/);
    expect(screen.queryByTestId("practice-app")).toBeNull();
  });

  it("serves each public page at its own path", async () => {
    renderAt("/rhythm");

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Rhythm you can see/);
  });

  it("hands anything else to the app", async () => {
    renderAt("/practice/reading");

    // The practice code is behind a lazy import, so a first visit to a public
    // page does not pay for it.
    await waitFor(() => expect(screen.getByTestId("practice-app")).toBeInTheDocument());
  });

  it("hands an unknown path to the app, which owns not-found", async () => {
    renderAt("/no-such-page");

    await waitFor(() => expect(screen.getByTestId("practice-app")).toBeInTheDocument());
  });

  it("ignores a trailing slash rather than falling through to the app", async () => {
    renderAt("/privacy/");

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/no server/);
  });

  it("treats a path the router cannot report as the site root", async () => {
    vi.resetModules();
    vi.doMock("raviger", () => ({ usePath: () => null, navigate: vi.fn() }));
    const { default: SiteWithoutPath } = await import("./Site");

    render(<SiteWithoutPath />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Practice reading music/);
    vi.doUnmock("raviger");
    vi.resetModules();
  });

  it("fails on purpose in the resilience build, so the recovery screen can be proven", () => {
    // Thrown from the outermost component rather than from the app, so the
    // check covers the public site too.
    vi.stubEnv("MODE", "resilience");
    window.sessionStorage.setItem("notesense.forceRenderError", "true");

    expect(() => render(<Site />)).toThrow(/Forced NoteSense render failure/);

    window.sessionStorage.clear();
    vi.unstubAllEnvs();
  });

  it("renders normally when the resilience flag is not set", () => {
    vi.stubEnv("MODE", "resilience");

    expect(() => render(<Site />)).not.toThrow();

    vi.unstubAllEnvs();
  });

  it("puts the page's own metadata in the document", async () => {
    renderAt("/singing");

    await waitFor(() => expect(document.title).toBe("Singing practice"));
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toMatch(/\/singing$/);
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toMatch(
      /no audio is recorded/i,
    );
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("Singing practice");
  });
});

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRoute } from "../routes";
import { useAppRoute } from "./useAppRoute";

// A minimal probe so the routing behaviour is tested on its own, without the
// rest of the app shell.
function RouteProbe() {
  const { route, isUnknownPath, goToRoute, goToSection } = useAppRoute();
  return (
    <div>
      <span data-testid="route-id">{route.id}</span>
      <span data-testid="route-section">{route.section}</span>
      <span data-testid="unknown">{String(isUnknownPath)}</span>
      <button type="button" onClick={() => goToSection("map")}>
        go map
      </button>
      <button type="button" onClick={() => goToRoute(getRoute("settings-data"))}>
        go settings
      </button>
    </div>
  );
}

const setPath = (path: string) => window.history.replaceState(null, "", path);

beforeEach(() => setPath("/practice/reading"));
afterEach(() => setPath("/"));

describe("useAppRoute", () => {
  it("resolves the destination from the URL", () => {
    setPath("/progress/history");
    render(<RouteProbe />);

    expect(screen.getByTestId("route-id")).toHaveTextContent("progress-history");
    expect(screen.getByTestId("route-section")).toHaveTextContent("history");
    expect(screen.getByTestId("unknown")).toHaveTextContent("false");
  });

  it("falls back to the default destination for an unknown path and says so", () => {
    setPath("/does-not-exist");
    render(<RouteProbe />);

    expect(screen.getByTestId("route-id")).toHaveTextContent("practice-reading");
    // The caller can tell a typo apart from a deliberate visit to the default.
    expect(screen.getByTestId("unknown")).toHaveTextContent("true");
  });

  it("treats the site root as the default destination", () => {
    setPath("/");
    render(<RouteProbe />);

    expect(screen.getByTestId("route-id")).toHaveTextContent("practice-reading");
  });

  it("navigates to an explicit destination", () => {
    render(<RouteProbe />);

    act(() => screen.getByRole("button", { name: "go settings" }).click());

    expect(window.location.pathname).toBe("/settings/data");
    expect(screen.getByTestId("route-id")).toHaveTextContent("settings-data");
  });

  it("navigates by section and updates the URL", () => {
    render(<RouteProbe />);

    act(() => screen.getByRole("button", { name: "go map" }).click());

    expect(window.location.pathname).toBe("/progress/map");
    expect(screen.getByTestId("route-id")).toHaveTextContent("progress-map");
  });

  it("survives browser back and forward", async () => {
    render(<RouteProbe />);

    act(() => screen.getByRole("button", { name: "go map" }).click());
    expect(screen.getByTestId("route-id")).toHaveTextContent("progress-map");

    // jsdom applies history navigation asynchronously, so wait for the popstate
    // to land rather than assuming it is synchronous.
    window.history.back();
    await waitFor(() => expect(screen.getByTestId("route-id")).toHaveTextContent("practice-reading"));

    window.history.forward();
    await waitFor(() => expect(screen.getByTestId("route-id")).toHaveTextContent("progress-map"));
  });

  it("renders the same destination after a reload of a deep link", () => {
    setPath("/settings/data");
    const first = render(<RouteProbe />);
    expect(screen.getByTestId("route-id")).toHaveTextContent("settings-data");
    first.unmount();

    // Remounting with the URL unchanged is what a reload looks like to the app.
    render(<RouteProbe />);
    expect(screen.getByTestId("route-id")).toHaveTextContent("settings-data");
  });
});

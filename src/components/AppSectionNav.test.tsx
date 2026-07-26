import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppSectionNav from "./AppSectionNav";

type NavProps = Parameters<typeof AppSectionNav>[0];

function renderNav(overrides: Partial<NavProps> = {}) {
  const props: NavProps = {
    activeRouteId: "practice-reading",
    isOpen: false,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
    ...overrides,
  };

  return { ...render(<AppSectionNav {...props} />), props };
}

describe("AppSectionNav", () => {
  it("lists every destination under its group heading", () => {
    renderNav();

    expect(screen.getByRole("navigation", { name: "NoteSense sections" })).toBeInTheDocument();
    for (const heading of ["Practice", "Progress", "Settings"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
    for (const label of [
      "Note reading",
      "Pitch training",
      "Songs",
      "Overview",
      "Map",
      "History",
      "Preferences",
      "Data",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("renders destinations as addressable links", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "Note reading" })).toHaveAttribute("href", "/practice/reading");
    expect(screen.getByRole("link", { name: "Songs" })).toHaveAttribute("href", "/practice/songs");
    expect(screen.getByRole("link", { name: "Data" })).toHaveAttribute("href", "/settings/data");
  });

  it("marks the active destination as the current page", () => {
    renderNav({ activeRouteId: "practice-pitch" });

    expect(screen.getByRole("link", { name: "Pitch training" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Pitch training" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Note reading" })).not.toHaveAttribute("aria-current");
  });

  it("marks a non-practice destination without marking a practice mode", () => {
    renderNav({ activeRouteId: "progress-map" });

    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Note reading" })).not.toHaveAttribute("aria-current");
  });

  it("reports navigation so the drawer can close", () => {
    const { props } = renderNav();

    fireEvent.click(screen.getByRole("link", { name: "Data" }));

    expect(props.onNavigate).toHaveBeenCalled();
  });

  it("shows the drawer backdrop only while open and closes on backdrop click", () => {
    const { props, rerender } = renderNav();
    expect(screen.queryByRole("button", { name: "Close menu" })).not.toBeInTheDocument();

    rerender(
      <AppSectionNav activeRouteId="practice-reading" isOpen onClose={props.onClose} onNavigate={props.onNavigate} />,
    );
    expect(screen.getByRole("navigation", { name: "NoteSense sections" })).toHaveClass("open");

    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape only while open", () => {
    const { props, rerender } = renderNav();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();

    rerender(
      <AppSectionNav activeRouteId="practice-reading" isOpen onClose={props.onClose} onNavigate={props.onNavigate} />,
    );
    fireEvent.keyDown(window, { key: "a" });
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

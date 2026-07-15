import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppSectionNav from "./AppSectionNav";

type NavProps = Parameters<typeof AppSectionNav>[0];

function renderNav(overrides: Partial<NavProps> = {}) {
  const props: NavProps = {
    activeSection: "practice",
    mode: "reading",
    isOpen: false,
    onClose: vi.fn(),
    onSelectSection: vi.fn(),
    onSelectPracticeMode: vi.fn(),
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
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active practice mode as pressed", () => {
    renderNav({ activeSection: "practice", mode: "pitch" });

    expect(screen.getByRole("button", { name: "Pitch training" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Note reading" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Songs" })).toHaveAttribute("aria-pressed", "false");
  });

  it("does not mark a practice mode when another section is active", () => {
    renderNav({ activeSection: "map", mode: "reading" });

    expect(screen.getByRole("button", { name: "Note reading" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Map" })).toHaveClass("active");
  });

  it("reports section and practice-mode selections", () => {
    const { props } = renderNav();

    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    fireEvent.click(screen.getByRole("button", { name: "Pitch training" }));

    expect(props.onSelectSection).toHaveBeenCalledWith("data");
    expect(props.onSelectPracticeMode).toHaveBeenCalledWith("pitch");
  });

  it("shows the drawer backdrop only while open and closes on backdrop click", () => {
    const { props, rerender } = renderNav();
    expect(screen.queryByRole("button", { name: "Close menu" })).not.toBeInTheDocument();

    rerender(
      <AppSectionNav
        activeSection="practice"
        mode="reading"
        isOpen
        onClose={props.onClose}
        onSelectSection={props.onSelectSection}
        onSelectPracticeMode={props.onSelectPracticeMode}
      />,
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
      <AppSectionNav
        activeSection="practice"
        mode="reading"
        isOpen
        onClose={props.onClose}
        onSelectSection={props.onSelectSection}
        onSelectPracticeMode={props.onSelectPracticeMode}
      />,
    );
    fireEvent.keyDown(window, { key: "a" });
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

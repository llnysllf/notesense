import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppSectionNav from "./AppSectionNav";

describe("AppSectionNav", () => {
  it("renders the three groups and the active group's views", () => {
    render(<AppSectionNav activeSection="practice" onSectionChange={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "NoteSense sections" });
    expect(nav).toBeInTheDocument();
    for (const label of ["Practice", "Progress", "Settings", "Drills", "Songs"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    // Other groups' views stay hidden until their group is active.
    expect(screen.queryByRole("button", { name: "Map" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Data" })).not.toBeInTheDocument();
  });

  it("shows the subsections of whichever group owns the active section", () => {
    render(<AppSectionNav activeSection="map" onSectionChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Progress" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Practice" })).toHaveAttribute("aria-pressed", "false");
    for (const label of ["Overview", "Map", "History"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Map" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a group's first view when the group button is clicked", () => {
    const onSectionChange = vi.fn();

    render(<AppSectionNav activeSection="practice" onSectionChange={onSectionChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));

    expect(onSectionChange).toHaveBeenNthCalledWith(1, "settings");
    expect(onSectionChange).toHaveBeenNthCalledWith(2, "progress");
  });

  it("reports the exact section id for subsection clicks", () => {
    const onSectionChange = vi.fn();

    render(<AppSectionNav activeSection="settings" onSectionChange={onSectionChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Data" }));

    expect(onSectionChange).toHaveBeenCalledWith("data");
  });

  it("keeps Songs inside the Practice group", () => {
    const onSectionChange = vi.fn();

    render(<AppSectionNav activeSection="songs" onSectionChange={onSectionChange} />);

    expect(screen.getByRole("button", { name: "Practice" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Songs" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Drills" })).toHaveAttribute("aria-pressed", "false");
  });
});

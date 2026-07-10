import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppSectionNav from "./AppSectionNav";

describe("AppSectionNav", () => {
  it("renders all six app sections", () => {
    render(<AppSectionNav activeSection="practice" onSectionChange={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "NoteSense sections" });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(6);
    for (const label of ["Practice", "Progress", "Map", "History", "Settings", "Data"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("marks only the active section as pressed", () => {
    render(<AppSectionNav activeSection="history" onSectionChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "History" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "History" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "Practice" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Practice" })).not.toHaveClass("active");
  });

  it("reports the selected section id", () => {
    const onSectionChange = vi.fn();

    render(<AppSectionNav activeSection="practice" onSectionChange={onSectionChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Data" }));

    expect(onSectionChange).toHaveBeenNthCalledWith(1, "settings");
    expect(onSectionChange).toHaveBeenNthCalledWith(2, "data");
  });
});

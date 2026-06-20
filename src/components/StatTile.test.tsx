import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatTile from "./StatTile";

describe("StatTile", () => {
  it("renders a text value with its label", () => {
    render(<StatTile label="Best streak" value="8 notes" />);

    expect(screen.getByText("Best streak")).toBeInTheDocument();
    expect(screen.getByText("8 notes")).toBeInTheDocument();
  });

  it("renders a numeric value", () => {
    render(<StatTile label="Accuracy" value={92} />);

    expect(screen.getByText("92")).toBeInTheDocument();
  });
});

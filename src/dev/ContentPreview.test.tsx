import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readingNoteGenerator } from "@notesense/shared";
import { ContentPreview } from "./ContentPreview";

describe("ContentPreview", () => {
  it("gives each generated item an accessible, inspectable summary", () => {
    render(<ContentPreview exercises={[readingNoteGenerator.generate({ seed: "preview" })]} />);
    expect(screen.getByRole("complementary", { name: "Content preview" })).toHaveTextContent("reading.staff-to-key");
  });
});

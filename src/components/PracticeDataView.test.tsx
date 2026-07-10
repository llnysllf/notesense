import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PracticeDataView from "./PracticeDataView";

function renderDataView(overrides: Partial<Parameters<typeof PracticeDataView>[0]> = {}) {
  const props = {
    onExportData: vi.fn(),
    onImportData: vi.fn(),
    onResetProgress: vi.fn(),
    ...overrides,
  };

  return { ...render(<PracticeDataView {...props} />), props };
}

describe("PracticeDataView", () => {
  it("renders the export, import, and reset controls", () => {
    renderDataView();

    expect(screen.getByRole("heading", { name: "Data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset progress" })).toBeInTheDocument();
  });

  it("exports data", () => {
    const { props } = renderDataView();

    fireEvent.click(screen.getByRole("button", { name: "Export data" }));
    expect(props.onExportData).toHaveBeenCalledTimes(1);
  });

  it("resets progress", () => {
    const { props } = renderDataView();

    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));
    expect(props.onResetProgress).toHaveBeenCalledTimes(1);
  });

  it("opens the hidden file input from the import button", () => {
    renderDataView();

    const fileInput = screen.getByLabelText("Import data file");
    const clickSpy = vi.spyOn(fileInput as HTMLInputElement, "click");

    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("imports the chosen file and clears the input for reselection", () => {
    const { props } = renderDataView();

    const fileInput = screen.getByLabelText("Import data file") as HTMLInputElement;
    const importFile = new File(['{"schemaVersion":1}'], "notesense-progress.json", { type: "application/json" });

    fireEvent.change(fileInput, { target: { files: [importFile] } });

    expect(props.onImportData).toHaveBeenCalledTimes(1);
    expect(props.onImportData).toHaveBeenCalledWith(importFile);
    expect(fileInput.value).toBe("");
  });

  it("ignores an empty file selection", () => {
    const { props } = renderDataView();

    fireEvent.change(screen.getByLabelText("Import data file"), { target: { files: [] } });
    expect(props.onImportData).not.toHaveBeenCalled();
  });
});

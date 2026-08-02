import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReadingScoreReport from "./ReadingScoreReport";
import { drawShareCard, downloadShareCard } from "../shareCardImage";
import type { ReadingScoreRecord, ReadingScoreResult } from "../types";

vi.mock("../shareCardImage", () => ({
  drawShareCard: vi.fn(() => true),
  downloadShareCard: vi.fn(),
}));

const result: ReadingScoreResult = {
  algorithmVersion: 1,
  score: 68,
  components: { noteAccuracy: 0.9, rhythmAccuracy: 0.55, continuity: 0.8, fluency: 0.7 },
  difficulty: 0.6,
  notesExpected: 15,
  notesPlayed: 15,
  confidence: 1,
  isProvisional: true,
};

const latest: ReadingScoreRecord = {
  id: "r1",
  recordedAtIso: "2026-08-01T10:00:00.000Z",
  algorithmVersion: 1,
  formVersion: 1,
  formId: "reading-score:v1:medium:seed",
  band: "medium",
  difficulty: 0.6,
  score: 68,
  components: result.components,
  inputSource: "touch",
  isProvisional: true,
};

type Props = Parameters<typeof ReadingScoreReport>[0];

function renderReport(overrides: Partial<Props> = {}) {
  const props: Props = {
    result,
    latest,
    trend: { kind: "first", label: "Your first Reading Score — a baseline." },
    isTrendworthy: true,
    storageWarning: false,
    onRetake: vi.fn(),
    ...overrides,
  };
  render(<ReadingScoreReport {...props} />);
  return props;
}

describe("ReadingScoreReport", () => {
  it("shows the score with a label a screen reader can use", () => {
    renderReport();

    expect(screen.getByLabelText("Reading Score 68 out of 100")).toHaveTextContent("68");
  });

  it("says the score is provisional rather than letting it read as standardized", () => {
    renderReport();

    expect(screen.getByRole("note")).toHaveTextContent(/not a standardized measure/i);
  });

  it("shows every component, because the overall number is the least actionable part", () => {
    renderReport();

    for (const label of ["Notes", "Rhythm", "Continuity", "Fluency"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  it("shows the trend when the run was solid enough to compare", () => {
    renderReport({ trend: { kind: "first", label: "Your first Reading Score — a baseline." } });

    expect(screen.getByText(/first Reading Score/i)).toBeInTheDocument();
  });

  it("explains why a thin run was not added to the history, and will not share it", () => {
    renderReport({ isTrendworthy: false });

    expect(screen.getByText(/not been added to your history/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save a share card" })).toBeDisabled();
  });

  it("says when the result could not be saved", () => {
    renderReport({ storageWarning: true });

    expect(screen.getByRole("status")).toHaveTextContent(/could not be saved/i);
  });

  it("offers another sitting", () => {
    const props = renderReport();

    fireEvent.click(screen.getByRole("button", { name: "Take another" }));
    expect(props.onRetake).toHaveBeenCalledTimes(1);
  });

  it("describes the share card for a screen reader, with no identifying detail", () => {
    renderReport();

    const canvas = screen.getByLabelText(/NoteSense Reading Score: 68/);
    const description = canvas.getAttribute("aria-label") ?? "";
    expect(description).toContain("Notes 90%");
    expect(description).not.toContain("r1");
    expect(description).not.toContain("seed");
  });
});

describe("ReadingScoreReport sharing", () => {
  beforeEach(() => {
    vi.mocked(drawShareCard).mockClear().mockReturnValue(true);
    vi.mocked(downloadShareCard).mockClear();
  });

  it("draws and hands over a card named for the day it was earned", () => {
    renderReport();

    fireEvent.click(screen.getByRole("button", { name: "Save a share card" }));

    expect(drawShareCard).toHaveBeenCalledTimes(1);
    expect(downloadShareCard).toHaveBeenCalledWith(expect.anything(), "notesense-reading-score-2026-08-01.png");
  });

  it("hands over nothing when the card could not be drawn", () => {
    vi.mocked(drawShareCard).mockReturnValue(false);
    renderReport();

    fireEvent.click(screen.getByRole("button", { name: "Save a share card" }));

    expect(downloadShareCard).not.toHaveBeenCalled();
  });

  it("still shows a result that was never written to history", () => {
    // No stored record, so the card is built from the run itself.
    renderReport({ latest: undefined });

    expect(screen.getByLabelText("Reading Score 68 out of 100")).toBeInTheDocument();
    expect(screen.getByLabelText(/NoteSense Reading Score: 68/)).toBeInTheDocument();
  });
});

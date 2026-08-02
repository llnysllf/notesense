import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AssessWorkspace from "./AssessWorkspace";
import { buildAssessmentPassage, startPlacement, type AssessmentView, type ReadingScoreResult } from "../types";

const passage = buildAssessmentPassage({ difficulty: 0.35, seed: "workspace-fixture" });

const result: ReadingScoreResult = {
  algorithmVersion: 1,
  score: 64,
  components: { noteAccuracy: 0.8, rhythmAccuracy: 0.6, continuity: 0.7, fluency: 0.5 },
  difficulty: passage.difficulty,
  notesExpected: passage.notes.length,
  notesPlayed: passage.notes.length,
  confidence: 1,
  isProvisional: true,
};

function view(overrides: Partial<AssessmentView["readingScore"]> = {}): AssessmentView {
  return {
    placement: {
      state: startPlacement(),
      promptNoteId: "C4",
      isComplete: false,
      outcome: undefined,
      startingPoint: undefined,
      saved: undefined,
      storageWarning: false,
      answer: vi.fn(),
      restart: vi.fn(),
      accept: vi.fn(),
    },
    readingScore: {
      passage,
      status: "idle",
      answeredCount: 0,
      result: null,
      isAudible: true,
      isTrendworthy: false,
      latest: undefined,
      trend: { kind: "first", label: "Your first Reading Score — a baseline." },
      storageWarning: false,
      start: vi.fn(),
      finish: vi.fn(),
      play: vi.fn(),
      retake: vi.fn(),
      ...overrides,
    },
  };
}

describe("AssessWorkspace", () => {
  it("shows the placement check on the placement destination", () => {
    render(<AssessWorkspace view="placement" assessment={view()} onSkipPlacement={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Where should you start?" })).toBeInTheDocument();
  });

  it("shows the runner before a result exists", () => {
    render(<AssessWorkspace view="reading-score" assessment={view()} onSkipPlacement={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Start the assessment" })).toBeInTheDocument();
  });

  it("shows the report once the run is complete", () => {
    render(
      <AssessWorkspace
        view="reading-score"
        assessment={view({ status: "complete", result, isTrendworthy: true })}
        onSkipPlacement={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Your Reading Score" })).toBeInTheDocument();
    expect(screen.getByLabelText("Reading Score 64 out of 100")).toBeInTheDocument();
  });

  it("keeps showing the runner if a run finished without producing a result", () => {
    render(
      <AssessWorkspace
        view="reading-score"
        assessment={view({ status: "complete", result: null })}
        onSkipPlacement={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Reading Score" })).toBeInTheDocument();
  });
});

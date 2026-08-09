import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SingingWorkspace from "./SingingWorkspace";
import { buildSingingExercise, SINGING_STAGES, type SingingDrillView, type SungScore } from "../types";

const RANGE = { version: 1, lowMidi: 55, highMidi: 69 };

const SCORE: SungScore = {
  components: { pitchCentre: 0.9, pitchStability: 0.8, transitions: 0.7, rhythm: 0.6, completion: 1 },
  total: 0.82,
  perNote: [{ targetMidi: 62, sung: true, sungMidi: 62.1, centsError: 10, onsetErrorMs: 20 }],
  summary: { centsError: 10, stability: 0.8, onsetErrorMs: 20, durationError: 0, inTune: true },
};

function renderableDrill(overrides: Partial<SingingDrillView> = {}): SingingDrillView {
  return {
    support: "available",
    status: "idle",
    stages: SINGING_STAGES,
    stageId: "match-one",
    exercise: buildSingingExercise({ stageId: "match-one", range: RANGE, seed: "fixture" }),
    range: RANGE,
    level: 0,
    score: null,
    isCalibrating: false,
    countdownSeconds: null,
    liveMidi: null,
    feedback: undefined,
    setStage: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    startCalibration: vi.fn(),
    playReference: vi.fn(),
    playPrompt: vi.fn(),
    next: vi.fn(),
    ...overrides,
  };
}

function renderDrill(overrides: Partial<SingingDrillView> = {}) {
  const drill = renderableDrill(overrides);
  render(<SingingWorkspace drill={drill} />);
  return drill;
}

describe("SingingWorkspace", () => {
  it("explains what happens to the audio before anything is recorded", () => {
    renderDrill();

    const privacy = screen.getByText(/No audio is recorded, saved, or sent anywhere/);
    expect(privacy).toBeInTheDocument();
    expect(privacy).toHaveTextContent(/only while you are singing/i);
  });

  it("offers the starting note, which is help that does not do the exercise", () => {
    const drill = renderDrill();

    fireEvent.click(screen.getByRole("button", { name: "Hear the starting note" }));
    expect(drill.playReference).toHaveBeenCalled();
  });

  it("plays a copying prompt before a non-reading exercise", () => {
    const drill = renderDrill();

    fireEvent.click(screen.getByRole("button", { name: "Hear the phrase" }));
    expect(drill.playPrompt).toHaveBeenCalled();
  });

  it("records only when asked", () => {
    const drill = renderDrill();

    fireEvent.click(screen.getByRole("button", { name: "Sing it" }));
    expect(drill.start).toHaveBeenCalled();
  });

  it("shows an input meter so the learner can see it is listening", () => {
    renderDrill({ status: "listening", level: 0.1 });

    const meter = screen.getByRole("meter", { name: "Microphone input level" });
    expect(meter).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("guides a calibration take", () => {
    renderDrill({ status: "listening", isCalibrating: true });

    expect(screen.getByText(/lowest comfortable note to your highest/i)).toBeInTheDocument();
  });

  it("offers to find a range, and to check it again once set", () => {
    renderDrill({ range: undefined });
    expect(screen.getByRole("button", { name: "Find my range" })).toBeInTheDocument();
  });

  it("says what happened when the microphone was refused", () => {
    renderDrill({ status: "denied" });

    expect(screen.getByRole("status")).toHaveTextContent(/did not get it/i);
    expect(screen.getByRole("status")).toHaveTextContent(/every other exercise still works/i);
  });

  it("says which browsers can do this when one cannot", () => {
    renderDrill({ support: "unsupported" });

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/cannot use a microphone/i);
    expect(note).toHaveTextContent(/works without it/i);
  });

  it("explains that a microphone needs a secure connection", () => {
    renderDrill({ support: "insecure-context" });

    expect(screen.getByRole("note")).toHaveTextContent(/secure \(https\) connection/i);
  });

  it("shows the phrase with a text description, not a waveform", () => {
    renderDrill();

    expect(screen.getByRole("img", { name: /Phrase to sing:/ })).toBeInTheDocument();
  });

  it("describes how each note went once graded", () => {
    renderDrill({ score: SCORE, feedback: "In tune and steady." });

    expect(screen.getByRole("img", { name: /sung 10 cents sharp/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "In tune" })).toBeInTheDocument();
    expect(screen.getByText("In tune and steady.")).toBeInTheDocument();
  });

  it("never grades tone quality", () => {
    renderDrill({ score: SCORE, feedback: "In tune and steady." });

    const panel = screen.getByLabelText("Singing");
    for (const word of ["tone", "timbre", "breathy", "nasal"]) {
      expect(panel.textContent?.toLowerCase()).not.toContain(word);
    }
  });

  it("repeats that nothing was recorded on the result", () => {
    renderDrill({ score: SCORE, feedback: "In tune and steady." });

    expect(screen.getByText(/Nothing was recorded/)).toBeInTheDocument();
  });

  it("moves on to another phrase", () => {
    const drill = renderDrill({ score: SCORE, feedback: "In tune and steady." });

    fireEvent.click(screen.getByRole("button", { name: "Try another" }));
    expect(drill.next).toHaveBeenCalled();
  });

  it("lets the learner pick a stage", () => {
    const drill = renderDrill();

    fireEvent.change(screen.getByLabelText("Exercise"), { target: { value: "sight-sing" } });
    expect(drill.setStage).toHaveBeenCalledWith("sight-sing");
  });
});

describe("SingingWorkspace detail", () => {
  it("offers to re-check a range that is already set", () => {
    renderDrill({ range: RANGE });

    expect(screen.getByRole("button", { name: "Check my range again" })).toBeInTheDocument();
  });

  it("says when it is waiting on the permission prompt", () => {
    renderDrill({ status: "requesting" });

    expect(screen.getByText("Asking for the microphone…")).toBeInTheDocument();
  });

  it("counts down and shows the live detected pitch before recording", () => {
    renderDrill({ status: "listening", countdownSeconds: 2, liveMidi: 60.1 });

    expect(screen.getByText("Starting in 2…")).toBeInTheDocument();
    expect(screen.getByText("Hearing C4")).toBeInTheDocument();
  });

  it("marks a note that was sung out of tune differently from one in tune", () => {
    const { container } = render(
      <SingingWorkspace
        drill={{
          ...renderableDrill(),
          score: {
            ...SCORE,
            perNote: [{ targetMidi: 62, sung: true, sungMidi: 63, centsError: 100, onsetErrorMs: 0 }],
            summary: { ...SCORE.summary, centsError: 100, inTune: false },
          },
          feedback: "The notes are sitting over the pitch.",
        }}
      />,
    );

    expect(container.querySelectorAll(".singing-sung.out")).toHaveLength(1);
    expect(container.querySelectorAll(".singing-sung.in-tune")).toHaveLength(0);
  });

  it("marks a note that was never sung", () => {
    const { container } = render(
      <SingingWorkspace
        drill={{
          ...renderableDrill(),
          score: { ...SCORE, perNote: [{ targetMidi: 62, sung: false }] },
          feedback: "You stopped part way.",
        }}
      />,
    );

    expect(container.querySelectorAll(".singing-missing")).toHaveLength(1);
  });

  it("reports a flat average as flat", () => {
    renderDrill({
      score: { ...SCORE, summary: { ...SCORE.summary, centsError: -40, inTune: false } },
      feedback: "The notes are sitting under the pitch.",
    });

    expect(screen.getByText(/40 cents flat/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Not quite in tune" })).toBeInTheDocument();
  });
});

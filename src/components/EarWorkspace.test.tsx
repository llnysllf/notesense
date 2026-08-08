import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EarWorkspace from "./EarWorkspace";
import { EAR_FAMILIES } from "../hooks/useEarDrill";
import { exerciseRegistry, type EarDrillView, type EarFamilyId, type EarResult } from "../types";

function drillFor(family: EarFamilyId, overrides: Partial<EarDrillView> = {}, result: EarResult | null = null) {
  const definition = exerciseRegistry.generate(family, { seed: "fixture", difficulty: 0.5 });
  const drill: EarDrillView = {
    family,
    families: EAR_FAMILIES,
    mode: "practice",
    midiNote: vi.fn(),
    session: {
      definition,
      result,
      canPlay: true,
      replaysLeft: "3 replays left.",
      play: vi.fn(),
      submit: vi.fn(),
      next: vi.fn(),
      noteEntered: vi.fn(),
    },
    transcriber: {
      notes: [],
      selected: null,
      canUndo: false,
      canRedo: false,
      select: vi.fn(),
      place: vi.fn(),
      removeAt: vi.fn(),
      nudgePitch: vi.fn(),
      nudgeOnset: vi.fn(),
      clear: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    },
    slots: [],
    lowMidi: 55,
    highMidi: 79,
    entered: [],
    taps: [],
    setFamily: vi.fn(),
    setMode: vi.fn(),
    playNote: vi.fn(),
    undoNote: vi.fn(),
    clearNotes: vi.fn(),
    tap: vi.fn(),
    submitChoice: vi.fn(),
    submit: vi.fn(),
    playAnswer: vi.fn(),
    ...overrides,
  };
  render(<EarWorkspace drill={drill} />);
  return drill;
}

describe("EarWorkspace", () => {
  it("says what is being asked and offers to play it", () => {
    drillFor("ear.interval");

    expect(screen.getByRole("heading", { name: "Ear training" })).toBeInTheDocument();
    expect(screen.getByText("Which interval was that?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
  });

  it("states the replay limit rather than leaving a button mysteriously grey", () => {
    drillFor("ear.interval");

    expect(screen.getByRole("status")).toHaveTextContent("3 replays left.");
  });

  it("lets the learner switch family and mode", () => {
    const drill = drillFor("ear.interval");

    fireEvent.change(screen.getByLabelText("Exercise"), { target: { value: "ear.chord" } });
    expect(drill.setFamily).toHaveBeenCalledWith("ear.chord");

    fireEvent.click(screen.getByRole("button", { name: "Test mode" }));
    expect(drill.setMode).toHaveBeenCalledWith("test");
  });

  it("offers every option in the family for a named answer", () => {
    drillFor("ear.chord");

    const options = within(screen.getByRole("group", { name: "Answer options" })).getAllByRole("button");
    // Hiding the harder qualities would inflate the score without teaching.
    expect(options.length).toBeGreaterThanOrEqual(7);

    fireEvent.click(screen.getByRole("button", { name: "Diminished" }));
  });

  it("submits a named answer as soon as it is chosen", () => {
    const drill = drillFor("ear.scale");

    fireEvent.click(screen.getByRole("button", { name: "Dorian" }));

    expect(drill.submitChoice).toHaveBeenCalledWith("dorian");
  });

  it("marks the right option in text as well as colour once answered", () => {
    drillFor("ear.chord", {}, { correct: false, score: 0, summary: "Not this time.", expectedOptionId: "minor" });

    expect(screen.getByRole("button", { name: "Minor — correct answer" })).toBeInTheDocument();
  });

  it("gives a keyboard for the families that ask you to play it back", () => {
    const drill = drillFor("ear.sequence", { entered: [60, 62] });

    expect(screen.getByText("Your answer: C4, D4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "White piano key E4" }));
    expect(drill.playNote).toHaveBeenCalledWith("E4");
  });

  it("lets a played-back answer be undone, cleared, heard, and submitted", () => {
    const drill = drillFor("ear.sequence", { entered: [60] });

    fireEvent.click(screen.getByRole("button", { name: "Undo note" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("button", { name: "Hear my answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(drill.undoNote).toHaveBeenCalled();
    expect(drill.clearNotes).toHaveBeenCalled();
    expect(drill.playAnswer).toHaveBeenCalled();
    expect(drill.submit).toHaveBeenCalled();
  });

  it("offers a tap control for the rhythm echo", () => {
    const drill = drillFor("ear.rhythm-echo", { taps: [0, 0.5] });

    expect(screen.getByText("2 taps")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tap" }));
    expect(drill.tap).toHaveBeenCalled();
  });

  it("shows the transcription editor for the written family", () => {
    const definition = exerciseRegistry.generate("ear.transcription", { seed: "fixture", difficulty: 0.5 });
    const expected = definition?.expectedAnswer;
    if (expected?.kind !== "transcription") throw new Error("expected a transcription");

    drillFor("ear.transcription", { slots: expected.notes.map((note) => note.onsetTicks) });

    expect(screen.getByRole("group", { name: "Where each note goes" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Empty staff/ })).toBeInTheDocument();
  });

  it("names the specific error rather than only a total", () => {
    drillFor(
      "ear.sequence",
      {},
      {
        correct: false,
        score: 0.8,
        summary: "Note 2 was a semitone low.",
        comparison: {
          steps: [
            { kind: "correct", expectedIndex: 0, midi: 60 },
            { kind: "wrong", expectedIndex: 1, expectedMidi: 62, playedMidi: 61, semitoneError: -1 },
          ],
          expectedCount: 2,
          correctCount: 1,
          wrongCount: 1,
          missingCount: 0,
          extraCount: 0,
          accuracy: 0.5,
          isExact: false,
          firstErrorIndex: 1,
        },
      },
    );

    expect(screen.getByRole("heading", { name: "Not quite" })).toBeInTheDocument();
    expect(screen.getByText("Note 2 was a semitone low.")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 notes, in order.")).toBeInTheDocument();
    expect(screen.getByText(/you played C#4, it was D4/)).toBeInTheDocument();
  });

  it("moves on to the next question", () => {
    const drill = drillFor("ear.interval", {}, { correct: true, score: 1, summary: "That's the one." });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(drill.session.next).toHaveBeenCalled();
  });
});

describe("EarWorkspace feedback detail", () => {
  it("lists a missing note and an extra one by position", () => {
    drillFor(
      "ear.sequence",
      {},
      {
        correct: false,
        score: 0.5,
        summary: "Note 2 is missing.",
        comparison: {
          steps: [
            { kind: "correct", expectedIndex: 0, midi: 60 },
            { kind: "missing", expectedIndex: 1, expectedMidi: 62 },
            { kind: "extra", afterIndex: 1, playedMidi: 67 },
          ],
          expectedCount: 2,
          correctCount: 1,
          wrongCount: 0,
          missingCount: 1,
          extraCount: 1,
          accuracy: 0,
          isExact: false,
          firstErrorIndex: 1,
        },
      },
    );

    expect(screen.getByText("Note 2: D4 — missing")).toBeInTheDocument();
    expect(screen.getByText("Extra note G4 after note 2")).toBeInTheDocument();
  });

  it("reports how much of a transcription landed on the beat", () => {
    drillFor(
      "ear.transcription",
      {},
      {
        correct: false,
        score: 0.7,
        summary: "The right notes — some are on the wrong beat.",
        transcription: {
          pitch: {
            steps: [],
            expectedCount: 0,
            correctCount: 0,
            wrongCount: 0,
            missingCount: 0,
            extraCount: 0,
            accuracy: 1,
            isExact: true,
          },
          rhythmAccuracy: 0.5,
          alignedCount: 2,
          total: 0.7,
          isExact: false,
        },
      },
    );

    expect(screen.getByText(/50% of the notes you wrote are on the right beat/)).toBeInTheDocument();
  });

  it("reports how many taps landed in time", () => {
    drillFor(
      "ear.rhythm-echo",
      {},
      {
        correct: false,
        score: 0.5,
        summary: "Close.",
        rhythm: {
          onsets: [],
          onTime: 2,
          expectedCount: 4,
          extraTaps: 0,
          onsetAccuracy: 0.5,
          pulseSteadiness: 0.8,
          meanErrorMs: 12,
          completion: 1,
        },
      },
    );

    expect(screen.getByText("2 of 4 taps landed in time.")).toBeInTheDocument();
  });

  it("says the exercise is still loading rather than showing an empty question", () => {
    drillFor("ear.interval", {
      session: {
        definition: undefined,
        result: null,
        canPlay: false,
        replaysLeft: undefined,
        play: vi.fn(),
        submit: vi.fn(),
        next: vi.fn(),
        noteEntered: vi.fn(),
      },
    });

    expect(screen.getByText("Loading the exercise…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("offers a replay once something has been played", () => {
    drillFor("ear.sequence", { entered: [60] });

    expect(screen.getByRole("button", { name: "Play again" })).toBeInTheDocument();
  });

  it("says a correct answer is correct", () => {
    drillFor("ear.interval", {}, { correct: true, score: 1, summary: "That's the one." });

    expect(screen.getByRole("heading", { name: "Correct" })).toBeInTheDocument();
  });
});

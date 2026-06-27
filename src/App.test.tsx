import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { playTone } from "./audio";
import { PITCH_NOTES, emptyProgress } from "./noteData";
import { defaultSettings, serializePracticeDataExport } from "./storage";
import type { PracticeProgress } from "./types";

vi.mock("./audio", () => ({
  playTone: vi.fn(),
}));

const PROGRESS_STORAGE_KEY = "notesense.progress.v2";
const SETTINGS_STORAGE_KEY = "notesense.settings.v3";

function freshProgress(): PracticeProgress {
  return structuredClone(emptyProgress);
}

function getCurrentReadingNoteId() {
  const staff = screen.getByRole("img", { name: /staff note/i });
  const noteLabel = staff.getAttribute("aria-label") ?? "";
  const match = /note ([A-G]\d)/.exec(noteLabel);

  if (!match?.[1]) {
    throw new Error(`Could not read current staff note from "${noteLabel}".`);
  }

  return match[1];
}

function getCurrentReadingPianoKeyButton() {
  return screen.getByRole("button", { name: `White piano key ${getCurrentReadingNoteId()}` });
}

function readStoredJson<T>(key: string): T {
  const value = window.localStorage.getItem(key);

  if (value === null) {
    throw new Error(`Missing stored value for ${key}.`);
  }

  return JSON.parse(value) as T;
}

function getWrongReadingNoteId() {
  const noteId = getCurrentReadingNoteId();
  const [, letter, octave] = /([A-G])(\d)/.exec(noteId) ?? [];

  if (letter === undefined || octave === undefined) {
    throw new Error(`Could not choose a wrong piano key for "${noteId}".`);
  }

  return `${letter}${octave === "4" ? "3" : "4"}`;
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders the default practice shell with answer controls disabled before a round starts", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "NoteSense" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Note reading" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pitch training" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("practice-feedback")).toHaveTextContent("Ready");
    expect(screen.getByRole("group", { name: "88-key piano keyboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "White piano key A0" })).toHaveAttribute("aria-disabled", "true");
  });

  it("starts a reading round, records an answer, and persists progress", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    expect(screen.getByText("Live round")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish round" })).toBeInTheDocument();

    fireEvent.click(getCurrentReadingPianoKeyButton());

    expect(screen.getByTestId("practice-feedback")).toHaveTextContent("Correct");
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).reading).toMatchObject({
      totalAttempts: 1,
      totalCorrect: 1,
    });
  });

  it("finishes a reading round and shows the saved-round summary", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    fireEvent.click(getCurrentReadingPianoKeyButton());
    fireEvent.click(screen.getByRole("button", { name: "Finish round" }));

    expect(screen.getByText("Round saved")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Last round" })).toBeInTheDocument();
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).history).toHaveLength(1);
  });

  it("shows the expected note after an incorrect reading answer", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    const expectedNoteId = getCurrentReadingNoteId();
    fireEvent.click(screen.getByRole("button", { name: `White piano key ${getWrongReadingNoteId()}` }));

    expect(screen.getByTestId("practice-feedback")).toHaveTextContent(`It was ${expectedNoteId}`);
  });

  it("persists settings changes and updates the visible reading range", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "30s" }));
    fireEvent.click(screen.getByRole("button", { name: "Grand" }));

    expect(readStoredJson<typeof defaultSettings>(SETTINGS_STORAGE_KEY)).toMatchObject({
      roundLength: 30,
      readingRange: "grand-starter",
    });
    expect(screen.getByRole("button", { name: "30s" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Grand" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("Mixed clef C3-B4")).not.toHaveLength(0);
  });

  it("surfaces a storage warning when settings cannot be saved", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "30s" }));

    expect(screen.getByRole("status")).toHaveTextContent("Progress is not being saved on this device right now.");
  });

  it("switches to pitch training and plays the prompt when a pitch round starts", () => {
    const playToneMock = vi.mocked(playTone);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Pitch training" }));
    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));

    expect(screen.getByRole("button", { name: "Pitch training" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Hidden pitch note")).toBeInTheDocument();
    expect(playToneMock).toHaveBeenCalledTimes(1);
  });

  it("hides the pitch answer after an incorrect answer when reveal is disabled", () => {
    const playToneMock = vi.mocked(playTone);
    render(<App />);

    fireEvent.click(screen.getByLabelText("Reveal pitch answer"));
    fireEvent.click(screen.getByRole("button", { name: "Pitch training" }));
    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    const playedFrequency = playToneMock.mock.calls.at(-1)?.[0];
    const expectedNote = PITCH_NOTES.find((note) => note.frequency === playedFrequency);
    const wrongAnswer = ["C", "D", "E", "F", "G", "A", "B"].find((answer) => answer !== expectedNote?.name);

    if (wrongAnswer === undefined) {
      throw new Error("Could not choose a wrong pitch answer.");
    }

    fireEvent.click(screen.getByRole("button", { name: `Answer ${wrongAnswer}` }));

    expect(screen.getByTestId("practice-feedback")).toHaveTextContent("Try the next one");
  });

  it("replays notes and can switch back to note reading from pitch training", () => {
    const playToneMock = vi.mocked(playTone);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Play note" }));
    fireEvent.click(screen.getByRole("button", { name: "Pitch training" }));
    fireEvent.click(screen.getByRole("button", { name: "Note reading" }));

    expect(playToneMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Note reading" })).toHaveAttribute("aria-pressed", "true");
  });

  it("imports practice data, updates settings, and resets the session shell", async () => {
    const importedProgress = freshProgress();
    importedProgress.reading.totalAttempts = 7;
    importedProgress.reading.totalCorrect = 5;
    const importedSettings = { ...defaultSettings, roundLength: 90 as const, readingRange: "bass-starter" as const };
    const file = new File(
      [serializePracticeDataExport(importedProgress, importedSettings, "2026-06-19T01:00:00.000Z")],
      "notesense-progress.json",
      { type: "application/json" },
    );

    render(<App />);
    fireEvent.change(screen.getByLabelText("Import data file"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Progress imported."));
    expect(screen.getByRole("button", { name: "90s" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("Bass clef C3-G3")).not.toHaveLength(0);
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).reading.totalAttempts).toBe(7);
  });

  it("resets saved progress only after confirmation", () => {
    const progress = freshProgress();
    progress.reading.totalAttempts = 4;
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    const confirm = vi.spyOn(window, "confirm");

    confirm.mockReturnValueOnce(false);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).reading.totalAttempts).toBe(4);

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).reading.totalAttempts).toBe(0);
  });
});

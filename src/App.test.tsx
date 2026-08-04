import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { playMelody, playTone } from "./audio";
import { PITCH_NOTES, emptyProgress } from "./noteData";
import { defaultSettings, serializePracticeDataExport } from "./storage";
import type { PracticeProgress } from "./types";

vi.mock("./audio", () => ({
  playMelody: vi.fn(),
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

// Routing reads the URL, so every test starts from a known destination rather
// than inheriting whatever the previous one navigated to.
beforeEach(() => {
  window.history.replaceState(null, "", "/practice/reading");
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/practice/reading");
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders the default practice shell with answer controls disabled before a round starts", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "NoteSense" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Note reading" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Pitch training" })).not.toHaveAttribute("aria-current");
    expect(await screen.findByTestId("practice-feedback")).toHaveTextContent("Ready");
    expect(screen.getByRole("group", { name: "88-key piano keyboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "White piano key A0" })).toHaveAttribute("aria-disabled", "true");
  });

  it("shows a recoverable not-found screen instead of silently starting a drill", async () => {
    window.history.replaceState(null, "", "/progress/not-a-route");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "That destination does not exist" })).toBeInTheDocument();
    expect(screen.getByText("/progress/not-a-route")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to practice" })).toHaveAttribute("href", "/practice/reading");
  });

  it("opens and closes the navigation drawer from the topbar menu button", async () => {
    render(<App />);

    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "NoteSense sections" })).toHaveClass("open");

    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("link", { name: "Songs" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(await screen.findByRole("heading", { name: "Song library" })).toBeInTheDocument();
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

  it("finishes a reading round and shows the saved-round summary", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    fireEvent.click(getCurrentReadingPianoKeyButton());
    fireEvent.click(screen.getByRole("button", { name: "Finish round" }));

    expect(screen.getByText("Round saved")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Overview" }));
    expect(await screen.findByRole("heading", { level: 3, name: "Last round" })).toBeInTheDocument();
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).history).toHaveLength(1);
  });

  it("shows the expected note after an incorrect reading answer", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    const expectedNoteId = getCurrentReadingNoteId();
    fireEvent.click(screen.getByRole("button", { name: `White piano key ${getWrongReadingNoteId()}` }));

    expect(screen.getByTestId("practice-feedback")).toHaveTextContent(`It was ${expectedNoteId}`);
  });

  it("persists settings changes and updates the visible reading range", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "Preferences" }));
    fireEvent.click(await screen.findByRole("button", { name: "30s" }));
    fireEvent.click(screen.getByRole("button", { name: "Grand" }));

    expect(readStoredJson<typeof defaultSettings>(SETTINGS_STORAGE_KEY)).toMatchObject({
      roundLength: 30,
      readingRange: "grand-starter",
    });
    expect(screen.getByRole("button", { name: "30s" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Grand" })).toHaveAttribute("aria-pressed", "true");

    // The chosen range is shown where it applies: on the drill itself.
    fireEvent.click(screen.getByRole("link", { name: "Note reading" }));
    expect(await screen.findByText("Mixed clef C3-B4")).toBeInTheDocument();
  });

  it("credits a Today block only after its drill actually finishes", async () => {
    window.history.replaceState(null, "", "/today");
    render(<App />);

    // Opening a block is an intent, not an achievement.
    const start = (await screen.findAllByRole("link", { name: "Start" }))[0] as HTMLElement;
    fireEvent.click(start);
    expect(readStoredJson<{ completedBlockIds: string[] }>("notesense.dailyPlan.v1").completedBlockIds).toEqual([]);

    fireEvent.click(await screen.findByRole("button", { name: "Start drill" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish round" }));

    await waitFor(() =>
      expect(readStoredJson<{ completedBlockIds: string[] }>("notesense.dailyPlan.v1").completedBlockIds).toHaveLength(
        1,
      ),
    );
  });

  it("opens the rhythm drill from its own destination", async () => {
    window.history.replaceState(null, "", "/practice/rhythm");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Tap the rhythm" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tempo" })).toBeInTheDocument();

    // Rhythm settings live with the drill, so changing them is handled here.
    fireEvent.click(screen.getByRole("button", { name: "120 BPM" }));
    expect(screen.getByRole("button", { name: "120 BPM" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens ear training on its own destination", async () => {
    window.history.replaceState(null, "", "/practice/ear");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Ear training" })).toBeInTheDocument();
    expect(screen.getByLabelText("Exercise")).toBeInTheDocument();
    // Every family is reachable from one picker.
    expect(within(screen.getByLabelText("Exercise")).getAllByRole("option")).toHaveLength(9);
  });

  it("opens the placement check and lets the learner leave it for practice", async () => {
    window.history.replaceState(null, "", "/assess/placement");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Where should you start?" })).toBeInTheDocument();

    // Placement is optional by design: skipping it must land somewhere useful.
    fireEvent.click(screen.getByRole("button", { name: "Skip the check" }));

    expect(await screen.findByRole("button", { name: "Start drill" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/practice/reading");
  });

  it("opens the Reading Score on its own destination", async () => {
    window.history.replaceState(null, "", "/assess/reading-score");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Reading Score" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start the assessment" })).toBeInTheDocument();
  });

  it("sets a custom reading range from piano keys", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    const customRangeCard = screen.getByLabelText("Custom range endpoint").closest(".custom-range-card");
    if (customRangeCard === null) {
      throw new Error("Missing custom range card.");
    }

    fireEvent.click(within(customRangeCard as HTMLElement).getByRole("button", { name: /^White piano key G3/ }));
    fireEvent.click(within(customRangeCard as HTMLElement).getByRole("button", { name: /^White piano key C4/ }));

    expect(readStoredJson<typeof defaultSettings>(SETTINGS_STORAGE_KEY)).toMatchObject({
      readingRange: "custom",
      customReadingRange: { startNoteId: "G3", endNoteId: "C4" },
    });
    expect(screen.getAllByText("Custom G3-C4")).not.toHaveLength(0);
  });

  it("surfaces a storage warning when settings cannot be saved", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });

    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: "Preferences" }));
    fireEvent.click(await screen.findByRole("button", { name: "30s" }));

    expect(screen.getByRole("status")).toHaveTextContent("Progress is not being saved on this device right now.");
  });

  it("switches to pitch training and plays the prompt when a pitch round starts", () => {
    const playToneMock = vi.mocked(playTone);
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "Pitch training" }));
    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));

    expect(screen.getByRole("link", { name: "Pitch training" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Hidden pitch note")).toBeInTheDocument();
    expect(playToneMock).toHaveBeenCalledTimes(1);
  });

  it("hides the pitch answer after an incorrect answer when reveal is disabled", async () => {
    const playToneMock = vi.mocked(playTone);
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "Preferences" }));
    fireEvent.click(await screen.findByLabelText("Reveal pitch answer"));
    fireEvent.click(screen.getByRole("link", { name: "Pitch training" }));
    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    const playedFrequency = playToneMock.mock.calls.at(-1)?.[0];
    const expectedNote = PITCH_NOTES.find((note) => note.frequency === playedFrequency);
    const wrongAnswer = ["C4", "C#4", "D4"].find((answer) => answer !== expectedNote?.id);

    if (wrongAnswer === undefined) {
      throw new Error("Could not choose a wrong pitch answer.");
    }

    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`piano key ${wrongAnswer}, inside selected range`) }),
    );

    expect(screen.getByTestId("practice-feedback")).toHaveTextContent("Try the next one");
  });

  it("runs pitch-sequence transcription and persists notes entered during playback", () => {
    const playMelodyMock = vi.mocked(playMelody);
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "Pitch training" }));
    fireEvent.click(screen.getByRole("button", { name: "Pitch sequence" }));
    fireEvent.click(screen.getByRole("button", { name: "Start drill" }));
    for (const [index, noteId] of ["C4", "C#4", "D4"].entries()) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`piano key ${noteId}, inside selected range`) }));
      expect(screen.getByRole("img", { name: new RegExp(`${index + 1} of 3 notes entered`) })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Submit sequence" }));

    expect(playMelodyMock).toHaveBeenCalledTimes(1);
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).pitch.totalAttempts).toBe(3);
    expect(screen.getByTestId("practice-feedback")).not.toHaveTextContent("Listening");
  });

  it("replays notes and can switch back to note reading from pitch training", () => {
    const playToneMock = vi.mocked(playTone);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Play note" }));
    fireEvent.click(screen.getByRole("link", { name: "Pitch training" }));
    fireEvent.click(screen.getByRole("link", { name: "Note reading" }));

    expect(playToneMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Note reading" })).toHaveAttribute("aria-current", "page");
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
    fireEvent.click(screen.getByRole("link", { name: "Data" }));
    fireEvent.change(await screen.findByLabelText("Import data file"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Progress imported."));
    fireEvent.click(screen.getByRole("link", { name: "Preferences" }));
    expect(screen.getByRole("button", { name: "90s" })).toHaveAttribute("aria-pressed", "true");
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).reading.totalAttempts).toBe(7);

    fireEvent.click(screen.getByRole("link", { name: "Note reading" }));
    expect(await screen.findByText("Bass clef C3-G3")).toBeInTheDocument();
  });

  it("resets saved progress only after confirmation", async () => {
    const progress = freshProgress();
    progress.reading.totalAttempts = 4;
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    const confirm = vi.spyOn(window, "confirm");

    confirm.mockReturnValueOnce(false);
    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: "Data" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reset progress" }));
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).reading.totalAttempts).toBe(4);

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));
    expect(readStoredJson<PracticeProgress>(PROGRESS_STORAGE_KEY).reading.totalAttempts).toBe(0);
  });
});

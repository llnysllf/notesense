import { playMelody, playTone } from "../audio";
import { evaluateMelodyAnswer } from "./practiceSessionLogic";
import { captureMelodyEvidenceAttempts } from "./evidenceCapture";
import { MELODY_ADVANCE_DELAY_MS } from "./practiceSessionConstants";
import type { PitchNote as PracticePitchNote, PracticeMode, PracticeProgress, PracticeSettings } from "../types";

type Note = { id: string; frequency: number };

export function startPracticeRound<ReadingNote extends Note, PitchNote extends Note>(options: {
  mode: PracticeMode;
  settings: PracticeSettings;
  currentMelody: readonly PitchNote[];
  currentPitchNote: PitchNote;
  setRoundStartedAt: (value: number) => void;
  setIsRunning: (value: boolean) => void;
  setFeedback: (value: null) => void;
  setLastSummary: (value: null) => void;
  setRoundAttempts: (value: number) => void;
  setRoundCorrect: (value: number) => void;
  setCurrentStreak: (value: number) => void;
  setBestRoundStreak: (value: number) => void;
  setTimeRemaining: (value: number) => void;
  getNextReadingNote: (previousId: string) => ReadingNote;
  getNextPitchMelody: (previousId?: string) => PitchNote[];
  getNextPitchNote: (previousId: string) => PitchNote;
  setCurrentReadingNote: (update: (note: ReadingNote) => ReadingNote) => void;
  setCurrentMelody: (value: PitchNote[]) => void;
  setCurrentPitchNote: (value: PitchNote) => void;
  setMelodyAnswerNoteIds: (value: string[]) => void;
}) {
  const { settings } = options;
  options.setRoundStartedAt(Date.now());
  options.setIsRunning(true);
  options.setFeedback(null);
  options.setLastSummary(null);
  options.setRoundAttempts(0);
  options.setRoundCorrect(0);
  options.setCurrentStreak(0);
  options.setBestRoundStreak(0);
  options.setTimeRemaining(settings.roundLength);
  if (options.mode === "reading") return options.setCurrentReadingNote((note) => options.getNextReadingNote(note.id));
  if (settings.pitchExercise === "melody") {
    const next = options.getNextPitchMelody(options.currentMelody.at(-1)?.id);
    options.setCurrentMelody(next);
    options.setMelodyAnswerNoteIds([]);
    if (settings.autoPlayPitch) playMelody(next.map((note) => note.frequency));
    return;
  }
  const next = options.getNextPitchNote(options.currentPitchNote.id);
  options.setCurrentPitchNote(next);
  if (settings.autoPlayPitch) playTone(next.frequency);
}

export function playPracticePrompt(options: {
  mode: PracticeMode;
  settings: PracticeSettings;
  melody: readonly Note[];
  readingFrequency: number;
  pitchFrequency: number;
}) {
  if (options.mode === "pitch" && options.settings.pitchExercise === "melody") {
    playMelody(options.melody.map((note) => note.frequency));
    return;
  }
  playTone(options.mode === "reading" ? options.readingFrequency : options.pitchFrequency);
}

export function submitMelodyPracticeAnswer(options: {
  progress: PracticeProgress;
  melody: PracticePitchNote[];
  answerNoteIds: string[];
  currentStreak: number;
  bestRoundStreak: number;
  timing: { wallIso: string; clock: number } | null;
  sessionId: string;
  answerMidis: (number | undefined)[];
  setFeedback: (value: ReturnType<typeof evaluateMelodyAnswer>["feedback"] | null) => void;
  setRoundAttempts: (update: (value: number) => number) => void;
  setRoundCorrect: (update: (value: number) => number) => void;
  setCurrentStreak: (value: number) => void;
  setBestRoundStreak: (value: number) => void;
  onProgressChange: (value: PracticeProgress) => void;
  clearAdvanceTimer: () => void;
  setAdvanceTimer: (value: number | null) => void;
  getNextPitchMelody: (previousId?: string, nextProgress?: PracticeProgress) => PracticePitchNote[];
  setCurrentMelody: (value: PracticePitchNote[]) => void;
  setMelodyAnswerNoteIds: (value: string[]) => void;
  autoPlayPitch: boolean;
  setPromptTiming: () => void;
}) {
  const { correctCount, feedback, nextProgress, streakResult } = evaluateMelodyAnswer({
    progress: options.progress,
    melody: options.melody,
    answerNoteIds: options.answerNoteIds,
    currentStreak: options.currentStreak,
    bestRoundStreak: options.bestRoundStreak,
  });
  options.setFeedback(feedback);
  options.setRoundAttempts((attempts) => attempts + options.melody.length);
  options.setRoundCorrect((correct) => correct + correctCount);
  options.setCurrentStreak(streakResult.streak);
  options.setBestRoundStreak(streakResult.best);
  options.onProgressChange(nextProgress);
  captureMelodyEvidenceAttempts({
    timing: options.timing,
    sessionId: options.sessionId,
    notes: options.melody,
    answerNoteIds: options.answerNoteIds,
    answerMidis: options.answerMidis,
  });
  options.clearAdvanceTimer();
  options.setAdvanceTimer(
    window.setTimeout(() => {
      options.setAdvanceTimer(null);
      const next = options.getNextPitchMelody(options.melody.at(-1)?.id, nextProgress);
      options.setPromptTiming();
      options.setCurrentMelody(next);
      options.setMelodyAnswerNoteIds([]);
      options.setFeedback(null);
      if (options.autoPlayPitch) playMelody(next.map((note) => note.frequency));
    }, MELODY_ADVANCE_DELAY_MS),
  );
}

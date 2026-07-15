import { getPianoKeyById } from "../noteData";
import { createSessionRecord, createSessionSummary } from "../practiceEngine";
import {
  completeRound,
  recordPitchAttempt,
  recordPitchLocationAttempt,
  recordPitchSequenceAttempt,
  recordReadingAttempt,
  recordReadingLocationAttempt,
} from "../storage";
import type {
  FeedbackState,
  NoteName,
  PitchNote,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  ReadingNoteName,
  SessionSummary,
  TrainingNote,
} from "../types";

type CompleteSessionRoundOptions = {
  mode: PracticeMode;
  settings: PracticeSettings;
  progress: PracticeProgress;
  roundAttempts: number;
  roundCorrect: number;
  bestRoundStreak: number;
  roundStartedAt: number | null;
  timeRemaining: number;
  completedAt?: number;
};

export function completeSessionRound(options: CompleteSessionRoundOptions): {
  nextProgress: PracticeProgress;
  summary: SessionSummary;
} {
  const completedAt = options.completedAt ?? Date.now();
  const durationSeconds = options.roundStartedAt
    ? Math.max(1, Math.round((completedAt - options.roundStartedAt) / 1000))
    : Math.max(0, options.settings.roundLength - options.timeRemaining);
  const sessionRecord = createSessionRecord({
    id: `${options.mode}-${completedAt}`,
    mode: options.mode,
    completedAt: new Date(completedAt).toISOString(),
    durationSeconds,
    score: options.roundCorrect,
    attempts: options.roundAttempts,
    bestStreak: options.bestRoundStreak,
  });
  const nextProgress = completeRound(options.progress, sessionRecord);
  const summary = createSessionSummary(
    options.mode,
    nextProgress,
    options.roundCorrect,
    options.roundAttempts,
    options.bestRoundStreak,
    options.settings.readingRange,
    options.settings.customReadingRange,
    options.settings.pitchRange,
    options.settings.customPitchRange,
  );

  return { nextProgress, summary };
}

type EvaluateSingleAnswerOptions = {
  answer: NoteName;
  answerId: string | undefined;
  mode: PracticeMode;
  readingNote: TrainingNote;
  pitchNote: PitchNote;
  currentStreak: number;
  bestRoundStreak: number;
  progress: PracticeProgress;
};

export function evaluateSingleAnswer(options: EvaluateSingleAnswerOptions) {
  const activeNote = options.mode === "reading" ? options.readingNote : options.pitchNote;
  const expectedAnswer = activeNote.name;
  const answerId = options.answerId;
  const isCorrect = answerId !== undefined ? answerId === activeNote.id : options.answer === expectedAnswer;
  const nextStreak = isCorrect ? options.currentStreak + 1 : 0;
  const nextBestStreak = Math.max(options.bestRoundStreak, nextStreak);
  const nextProgress =
    options.mode === "reading" && answerId !== undefined
      ? recordReadingLocationAttempt(options.progress, options.readingNote, answerId)
      : options.mode === "reading"
        ? recordReadingAttempt(options.progress, options.readingNote, options.answer as ReadingNoteName)
        : answerId !== undefined
          ? recordPitchLocationAttempt(options.progress, options.pitchNote, answerId)
          : recordPitchAttempt(options.progress, options.pitchNote, options.answer);
  const feedback: NonNullable<FeedbackState> =
    answerId === undefined ? { answer: options.answer, isCorrect } : { answer: options.answer, answerId, isCorrect };

  return { feedback, isCorrect, nextBestStreak, nextProgress, nextStreak };
}

type EvaluateMelodyAnswerOptions = {
  progress: PracticeProgress;
  melody: PitchNote[];
  answerNoteIds: string[];
  currentStreak: number;
  bestRoundStreak: number;
};

export function evaluateMelodyAnswer(options: EvaluateMelodyAnswerOptions) {
  const positionResults = options.melody.map((note, index) => note.id === options.answerNoteIds[index]);
  const correctCount = positionResults.filter(Boolean).length;
  const isCorrect = correctCount === options.melody.length;
  const streakResult = positionResults.reduce(
    (result, positionIsCorrect) => {
      const streak = positionIsCorrect ? result.streak + 1 : 0;
      return { streak, best: Math.max(result.best, streak) };
    },
    { streak: options.currentStreak, best: options.bestRoundStreak },
  );
  const nextProgress = recordPitchSequenceAttempt(options.progress, options.melody, options.answerNoteIds);
  const firstAnswerKey = getPianoKeyById(options.answerNoteIds[0] ?? "");
  const feedback: NonNullable<FeedbackState> = {
    answer: firstAnswerKey?.naturalName ?? "C",
    answerId: options.answerNoteIds.join(" "),
    isCorrect,
  };

  return { correctCount, feedback, nextProgress, streakResult };
}

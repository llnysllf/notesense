import type { MutableRefObject } from "react";
import { getPianoKeyById } from "../noteData";
import { ADVANCE_DELAY_MS } from "./practiceSessionConstants";
import { captureSingleEvidenceAttempt } from "./evidenceCapture";
import { playPracticePrompt } from "./practiceSessionActions";
import { evaluateSingleAnswer } from "./practiceSessionLogic";
import type { ReadingAcademyFlow } from "./useReadingAcademyFlow";
import type {
  FeedbackState,
  NoteName,
  PitchNote,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  TrainingNote,
} from "../types";
import { getReadingModeRules } from "../types";

type SingleAnswerControlsOptions = {
  mode: PracticeMode;
  settings: PracticeSettings;
  progress: PracticeProgress;
  currentMelody: PitchNote[];
  currentReadingNote: TrainingNote;
  currentPitchNote: PitchNote;
  feedback: FeedbackState;
  isRunning: boolean;
  currentStreak: number;
  bestRoundStreak: number;
  roundAttempts: number;
  roundCorrect: number;
  roundStartedAt: number | null;
  timeRemaining: number;
  readingAcademy: ReadingAcademyFlow;
  getNextReadingNote: (previousId?: string, nextProgress?: PracticeProgress) => TrainingNote;
  getNextPitchNote: (previousId?: string, nextProgress?: PracticeProgress) => PitchNote;
  setFeedback: (value: FeedbackState) => void;
  setRoundAttempts: (update: (value: number) => number) => void;
  setRoundCorrect: (update: (value: number) => number) => void;
  setCurrentStreak: (value: number) => void;
  setBestRoundStreak: (value: number) => void;
  setCurrentReadingNote: (value: TrainingNote | ((note: TrainingNote) => TrainingNote)) => void;
  setCurrentPitchNote: (value: PitchNote) => void;
  onProgressChange: (next: PracticeProgress) => void;
  clearAdvanceTimer: () => void;
  advanceTimerRef: MutableRefObject<number | null>;
  promptStartedAtRef: MutableRefObject<{ wallIso: string; clock: number } | null>;
  sessionIdRef: MutableRefObject<string>;
};

export function useSingleAnswerControls(options: SingleAnswerControlsOptions) {
  const promptStartedAtRef = options.promptStartedAtRef;

  function playCurrentNote() {
    playPracticePrompt({
      mode: options.mode,
      settings: options.settings,
      melody: options.currentMelody,
      readingFrequency: options.currentReadingNote.frequency,
      pitchFrequency: options.currentPitchNote.frequency,
    });
  }

  function recordAnswer(answer: NoteName, answerId?: string) {
    if (options.feedback !== null || !options.isRunning) return;
    const answeredMode = options.mode;
    const answeredReadingNote = options.currentReadingNote;
    const answeredPitchNote = options.currentPitchNote;
    const {
      feedback: nextFeedback,
      isCorrect,
      nextBestStreak,
      nextProgress,
      nextStreak,
    } = evaluateSingleAnswer({
      answer,
      answerId,
      mode: answeredMode,
      readingNote: answeredReadingNote,
      pitchNote: answeredPitchNote,
      currentStreak: options.currentStreak,
      bestRoundStreak: options.bestRoundStreak,
      progress: options.progress,
    });
    options.setFeedback(nextFeedback);
    options.setRoundAttempts((n) => n + 1);
    options.setRoundCorrect((n) => n + (isCorrect ? 1 : 0));
    options.setCurrentStreak(nextStreak);
    options.setBestRoundStreak(nextBestStreak);

    const isReadingTestAnswer =
      answeredMode === "reading" &&
      options.readingAcademy.recordTestAnswer(isCorrect, promptStartedAtRef.current?.clock);
    if (!isReadingTestAnswer) options.onProgressChange(nextProgress);
    options.readingAcademy.clearAudiationTimer();

    const answerMidi = getPianoKeyById(answerId ?? "")?.midi;
    if (answeredMode !== "reading" || getReadingModeRules(options.settings.readingMode).contributesEvidence) {
      captureSingleEvidenceAttempt({
        timing: promptStartedAtRef.current,
        sessionId: options.sessionIdRef.current,
        mode: answeredMode,
        promptId: answeredMode === "reading" ? answeredReadingNote.id : answeredPitchNote.id,
        correct: isCorrect,
        ...(answerMidi === undefined ? {} : { answerMidi }),
      });
    }

    options.clearAdvanceTimer();
    options.advanceTimerRef.current = window.setTimeout(() => {
      options.advanceTimerRef.current = null;
      options.setFeedback(null);
      if (answeredMode === "reading") {
        promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
        if (
          options.readingAcademy.advanceAfterReadingAnswer({
            answeredReadingNote,
            isCorrect,
            nextProgress,
            roundAttempts: options.roundAttempts,
            roundCorrect: options.roundCorrect,
            nextBestStreak,
            roundStartedAt: options.roundStartedAt,
            timeRemaining: options.timeRemaining,
            onProgressChange: options.onProgressChange,
          })
        ) {
          return;
        }
        options.setCurrentReadingNote((note) => options.getNextReadingNote(note.id, nextProgress));
        options.readingAcademy.reset();
        return;
      }

      const nextPitch = options.getNextPitchNote(answeredPitchNote.id, nextProgress);
      promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
      options.setCurrentPitchNote(nextPitch);
      if (options.settings.autoPlayPitch) {
        playPracticePrompt({
          mode: "pitch",
          settings: options.settings,
          melody: [],
          readingFrequency: nextPitch.frequency,
          pitchFrequency: nextPitch.frequency,
        });
      }
    }, ADVANCE_DELAY_MS);
  }

  function handleReadingKeyAnswer(noteId: string) {
    const key = getPianoKeyById(noteId);
    if (!key) return;
    recordAnswer(key.naturalName, key.id);
  }

  function handlePitchKeyAnswer(noteId: string) {
    const key = getPianoKeyById(noteId);
    if (!key) return;
    recordAnswer(key.naturalName, key.id);
  }

  return { playCurrentNote, recordAnswer, handleReadingKeyAnswer, handlePitchKeyAnswer };
}

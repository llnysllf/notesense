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
  const {
    mode,
    settings,
    progress,
    currentMelody,
    currentReadingNote,
    currentPitchNote,
    feedback,
    isRunning,
    currentStreak,
    bestRoundStreak,
    roundAttempts,
    roundCorrect,
    roundStartedAt,
    timeRemaining,
    readingAcademy,
    getNextReadingNote,
    getNextPitchNote,
    setFeedback,
    setRoundAttempts,
    setRoundCorrect,
    setCurrentStreak,
    setBestRoundStreak,
    setCurrentReadingNote,
    setCurrentPitchNote,
    onProgressChange,
    clearAdvanceTimer,
    advanceTimerRef,
    promptStartedAtRef,
    sessionIdRef,
  } = options;

  function playCurrentNote() {
    playPracticePrompt({
      mode,
      settings,
      melody: currentMelody,
      readingFrequency: currentReadingNote.frequency,
      pitchFrequency: currentPitchNote.frequency,
    });
  }

  function recordAnswer(answer: NoteName, answerId?: string) {
    if (feedback !== null || !isRunning) return;
    const answeredMode = mode;
    const answeredReadingNote = currentReadingNote;
    const answeredPitchNote = currentPitchNote;
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
      currentStreak,
      bestRoundStreak,
      progress,
    });
    setFeedback(nextFeedback);
    setRoundAttempts((n) => n + 1);
    setRoundCorrect((n) => n + (isCorrect ? 1 : 0));
    setCurrentStreak(nextStreak);
    setBestRoundStreak(nextBestStreak);

    const isReadingTestAnswer = answeredMode === "reading" && readingAcademy.recordTestAnswer(isCorrect);
    if (!isReadingTestAnswer) onProgressChange(nextProgress);
    readingAcademy.clearAudiationTimer();

    const answerMidi = getPianoKeyById(answerId ?? "")?.midi;
    if (answeredMode !== "reading" || getReadingModeRules(settings.readingMode).contributesEvidence) {
      captureSingleEvidenceAttempt({
        timing: promptStartedAtRef.current,
        sessionId: sessionIdRef.current,
        mode: answeredMode,
        promptId: answeredMode === "reading" ? answeredReadingNote.id : answeredPitchNote.id,
        correct: isCorrect,
        ...(answerMidi === undefined ? {} : { answerMidi }),
      });
    }

    clearAdvanceTimer();
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      setFeedback(null);
      if (answeredMode === "reading") {
        promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
        if (
          readingAcademy.advanceAfterReadingAnswer({
            answeredReadingNote,
            isCorrect,
            nextProgress,
            roundAttempts,
            roundCorrect,
            nextBestStreak,
            roundStartedAt,
            timeRemaining,
            onProgressChange,
          })
        ) {
          return;
        }
        setCurrentReadingNote((note) => getNextReadingNote(note.id, nextProgress));
        readingAcademy.reset();
        return;
      }

      const nextPitch = getNextPitchNote(answeredPitchNote.id, nextProgress);
      promptStartedAtRef.current = { wallIso: new Date().toISOString(), clock: performance.now() };
      setCurrentPitchNote(nextPitch);
      if (settings.autoPlayPitch) {
        playPracticePrompt({
          mode: "pitch",
          settings,
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

import { useState } from "react";
import { selectPitchMelody, selectPitchNote, selectReadingNote } from "../practiceEngine";
import { getReadingModeRules } from "../types";
import type { PitchNote, PracticeProgress, PracticeSettings, TrainingNote } from "../types";

type UsePracticeItemsOptions = {
  settings: PracticeSettings;
  progress: PracticeProgress;
};

export function usePracticeItems({ settings, progress }: UsePracticeItemsOptions) {
  const [currentReadingNote, setCurrentReadingNote] = useState<TrainingNote>(() =>
    selectReadingNote({ customReadingRange: settings.customReadingRange, readingRange: settings.readingRange }),
  );
  const [currentPitchNote, setCurrentPitchNote] = useState<PitchNote>(() =>
    selectPitchNote({ customPitchRange: settings.customPitchRange, pitchRange: settings.pitchRange }),
  );
  const [currentMelody, setCurrentMelody] = useState<PitchNote[]>(() =>
    selectPitchMelody({
      customPitchRange: settings.customPitchRange,
      length: settings.melodyLength,
      pitchRange: settings.pitchRange,
    }),
  );
  const [melodyAnswerNoteIds, setMelodyAnswerNoteIds] = useState<string[]>([]);

  function getNextReadingNote(previousNoteId?: string, nextProgress = progress): TrainingNote {
    const options = {
      customReadingRange: settings.customReadingRange,
      progress: nextProgress.reading,
      readingRange: settings.readingRange,
      // Learn, Test, and Custom deliberately do not adapt: a test must not
      // chase weak notes mid-run, and the other two follow the learner's lead.
      useAdaptive: settings.adaptivePractice && getReadingModeRules(settings.readingMode).adaptiveSelection,
    };
    return selectReadingNote(previousNoteId === undefined ? options : { ...options, previousNoteId });
  }

  function getNextPitchNote(previousNoteId?: string, nextProgress = progress): PitchNote {
    const options = {
      customPitchRange: settings.customPitchRange,
      pitchRange: settings.pitchRange,
      progress: nextProgress.pitch,
      useAdaptive: settings.adaptivePractice,
    };
    return selectPitchNote(previousNoteId === undefined ? options : { ...options, previousNoteId });
  }

  function getNextPitchMelody(previousNoteId?: string, nextProgress = progress): PitchNote[] {
    const options = {
      customPitchRange: settings.customPitchRange,
      length: settings.melodyLength,
      pitchRange: settings.pitchRange,
      progress: nextProgress.pitch,
      useAdaptive: settings.adaptivePractice,
    };
    return selectPitchMelody(previousNoteId === undefined ? options : { ...options, previousNoteId });
  }

  function resetItems(nextSettings: PracticeSettings, nextProgress: PracticeProgress) {
    setCurrentReadingNote(
      selectReadingNote({
        progress: nextProgress.reading,
        customReadingRange: nextSettings.customReadingRange,
        readingRange: nextSettings.readingRange,
        useAdaptive: nextSettings.adaptivePractice,
      }),
    );
    setCurrentPitchNote(
      selectPitchNote({
        customPitchRange: nextSettings.customPitchRange,
        pitchRange: nextSettings.pitchRange,
        progress: nextProgress.pitch,
        useAdaptive: nextSettings.adaptivePractice,
      }),
    );
    setCurrentMelody(
      selectPitchMelody({
        customPitchRange: nextSettings.customPitchRange,
        length: nextSettings.melodyLength,
        pitchRange: nextSettings.pitchRange,
        progress: nextProgress.pitch,
        useAdaptive: nextSettings.adaptivePractice,
      }),
    );
    setMelodyAnswerNoteIds([]);
  }

  return {
    currentMelody,
    currentPitchNote,
    currentReadingNote,
    melodyAnswerNoteIds,
    getNextPitchMelody,
    getNextPitchNote,
    getNextReadingNote,
    resetItems,
    setCurrentMelody,
    setCurrentPitchNote,
    setCurrentReadingNote,
    setMelodyAnswerNoteIds,
  };
}

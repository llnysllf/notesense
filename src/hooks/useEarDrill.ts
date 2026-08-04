// Everything the ear screen needs, wired in one place.
//
// The nine families answer in four different ways — a name, notes played back,
// taps, a written phrase — so this hook owns the answer being assembled and
// hands the workspace one shape. That keeps the workspace presentational and
// stops each family growing its own private state.

import { useCallback, useMemo, useState } from "react";
import { playPitches } from "../earAudio";
import { midiForNoteId, useEarSession } from "./useEarSession";
import { useTranscriber } from "./useTranscriber";
import { type EarDrillView, type EarFamily, type EarFamilyId, type ReadingMode } from "../types";

export const EAR_FAMILIES: readonly EarFamily[] = [
  { id: "ear.interval", label: "Intervals", summary: "Name the distance between two notes." },
  { id: "ear.chord", label: "Chords", summary: "Name the quality of a chord." },
  { id: "ear.scale", label: "Scales", summary: "Name a scale or mode." },
  { id: "ear.cadence", label: "Cadences", summary: "Name how a phrase closes." },
  { id: "ear.interval-play", label: "Play an interval", summary: "Play back two notes you heard." },
  { id: "ear.sequence", label: "Note sequences", summary: "Play back a sequence of notes." },
  { id: "ear.key-centre", label: "Key centre", summary: "Find the note a phrase wants to end on." },
  { id: "ear.rhythm-echo", label: "Rhythm echo", summary: "Tap back a rhythm." },
  { id: "ear.transcription", label: "Transcription", summary: "Write down what you hear." },
];

// The tempo a rhythm echo is played and graded at. Fixed for now, so a tapped
// answer and the phrase it echoes are on the same grid.
const ECHO_BPM = 80;

// C3 to C6: comfortably wider than any generated phrase, so the editor never
// hints at where the answer sits.
const TRANSCRIBER_LOW_MIDI = 48;
const TRANSCRIBER_HIGH_MIDI = 84;

export type UseEarDrillOptions = {
  difficulty?: number;
  onGraded?: Parameters<typeof useEarSession>[0]["onGraded"];
};

// Ear attempts take the same path into the ledger as reading attempts: same
// event shape, same projections. That is the slice's exit gate, and it holds
// because there is only one way in.
function recordEarEvidence(
  result: Parameters<NonNullable<UseEarDrillOptions["onGraded"]>>[0],
  definition: Parameters<NonNullable<UseEarDrillOptions["onGraded"]>>[1],
) {
  const competencyId = definition.competencyIds[0];
  if (!competencyId) return;
  void import("../evidenceLedger").then(({ createLiveAttemptEvent, recordEvidenceAttempt }) => {
    const answeredAt = new Date();
    recordEvidenceAttempt(
      createLiveAttemptEvent({
        sessionId: `ear-${answeredAt.toDateString()}`,
        exerciseId: definition.id,
        promptId: definition.seed ?? definition.id,
        startedAtIso: answeredAt.toISOString(),
        answeredAtIso: answeredAt.toISOString(),
        responseMs: 0,
        competencyId,
        correct: result.correct,
      }),
    );
  });
}

export function useEarDrill({ difficulty = 0.4, onGraded }: UseEarDrillOptions = {}): EarDrillView {
  const [family, setFamily] = useState<EarFamilyId>("ear.interval");
  const [mode, setMode] = useState<ReadingMode>("practice");
  const [entered, setEntered] = useState<number[]>([]);
  const [taps, setTaps] = useState<number[]>([]);

  const handleGraded = useCallback<NonNullable<UseEarDrillOptions["onGraded"]>>(
    (result, definition) => {
      recordEarEvidence(result, definition);
      onGraded?.(result, definition);
    },
    [onGraded],
  );

  const session = useEarSession({ family, mode, difficulty, onGraded: handleGraded });

  const definition = session.definition;

  // The grid a transcription is written on: the phrase's own onsets, so the
  // learner is placing notes where the music actually goes rather than onto an
  // arbitrary ruler.
  const slots = useMemo(() => {
    const expected = definition?.expectedAnswer;
    if (expected?.kind === "transcription") return expected.notes.map((note) => note.onsetTicks);
    return [];
  }, [definition]);

  // Entry spans a fixed, generous range rather than the phrase's own. Narrowing
  // it to the source would quietly tell the learner how high and low the answer
  // goes — and would refuse a note they genuinely thought they heard.
  const lowMidi = TRANSCRIBER_LOW_MIDI;
  const highMidi = TRANSCRIBER_HIGH_MIDI;

  const transcriber = useTranscriber({ slots, lowMidi, highMidi });

  const resetEntry = useCallback(() => {
    setEntered([]);
    setTaps([]);
  }, []);

  const playNote = useCallback(
    (noteId: string) => {
      const midi = midiForNoteId(noteId);
      if (midi === undefined) return;
      session.noteEntered();
      setEntered((current) => [...current, midi]);
    },
    [session],
  );

  const undoNote = useCallback(() => setEntered((current) => current.slice(0, -1)), []);
  const clearNotes = useCallback(() => setEntered([]), []);

  const tap = useCallback(() => {
    session.noteEntered();
    // Zeroed on the first tap: an echo is about the pattern, not about how
    // quickly the learner started.
    setTaps((current) => [...current, performance.now() / 1000]);
  }, [session]);

  const playAnswer = useCallback(() => {
    if (family === "ear.transcription") playPitches(transcriber.notes.map((note) => note.midi));
    else playPitches(entered);
  }, [entered, family, transcriber.notes]);

  // Named answers go straight in; everything else is assembled first and
  // submitted when the learner says they are done.
  const submitChoice = useCallback((optionId: string) => session.submit({ kind: "choice", optionId }), [session]);

  const submit = useCallback(() => {
    if (family === "ear.transcription") {
      session.submit({ kind: "transcription", notes: transcriber.notes });
      return;
    }
    if (family === "ear.rhythm-echo") {
      const first = taps[0] ?? 0;
      session.submit({ kind: "rhythm", onsetsSeconds: taps.map((at) => at - first), bpm: ECHO_BPM });
      return;
    }
    session.submit({ kind: "pitch-sequence", midi: entered });
  }, [entered, family, session, taps, transcriber.notes]);

  const next = useCallback(() => {
    resetEntry();
    transcriber.clear();
    session.next();
  }, [resetEntry, session, transcriber]);

  const chooseFamily = useCallback(
    (nextFamily: EarFamilyId) => {
      resetEntry();
      setFamily(nextFamily);
    },
    [resetEntry],
  );

  return {
    family,
    families: EAR_FAMILIES,
    mode,
    session: { ...session, next },
    transcriber,
    slots,
    lowMidi,
    highMidi,
    entered,
    taps,
    setFamily: chooseFamily,
    setMode,
    playNote,
    undoNote,
    clearNotes,
    tap,
    submitChoice,
    submit,
    playAnswer,
  };
}

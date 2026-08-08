// Running an ear-training exercise.
//
// Every family goes through the same loop — generate, play, answer, grade,
// record — even though the answers look nothing alike: a name, a played-back
// sequence, a tapped rhythm, a written phrase. Keeping one loop is what makes
// the exit gate true: ear exercises produce the same evidence as reading,
// because they take the same path to get there.

import { useCallback, useMemo, useState } from "react";
import { playStimulus } from "../earAudio";
import { getPianoKeyById } from "../noteData";
import {
  canReplay,
  compareSequences,
  describeReplays,
  describeRhythm,
  describeSequenceComparison,
  exerciseRegistry,
  gradeRhythm,
  scoreTranscription,
  toleranceForTempo,
  type EarAnswerInput,
  type EarFamilyId,
  type EarResult,
  type EarSessionView,
  type ExerciseDefinition,
  type ReadingMode,
} from "../types";

export type EarSessionOptions = {
  family: EarFamilyId;
  mode: ReadingMode;
  difficulty: number;
  onGraded?: (result: EarResult, definition: ExerciseDefinition) => void;
};

function newSeed(): string {
  return `${Date.now()}-${Math.round(performance.now() * 1000)}`;
}

// Grades whatever kind of answer this family produces. The shape of the answer
// varies; the shape of the verdict does not.
function grade(definition: ExerciseDefinition, answer: EarAnswerInput): EarResult {
  const expected = definition.expectedAnswer;

  if (expected.kind === "choice" && answer.kind === "choice") {
    const correct = expected.optionId === answer.optionId;
    return {
      correct,
      score: correct ? 1 : 0,
      summary: correct ? "That's the one." : "Not this time — listen again for the shape.",
      expectedOptionId: expected.optionId,
    };
  }

  if (expected.kind === "pitch" && answer.kind === "pitch-sequence") {
    const correct = answer.midi.length === 1 && answer.midi[0] === expected.midi;
    return {
      correct,
      score: correct ? 1 : 0,
      summary: correct ? "That's the key centre." : "Not the note it wanted to land on.",
    };
  }

  if (expected.kind === "pitch-sequence" && answer.kind === "pitch-sequence") {
    // Partial credit with positional feedback: a learner who got eight of ten
    // notes should be told which two, not handed a pass/fail.
    const comparison = compareSequences(expected.midi, answer.midi);
    return {
      correct: comparison.isExact,
      score: comparison.accuracy,
      summary: describeSequenceComparison(comparison),
      comparison,
    };
  }

  if (expected.kind === "rhythm" && answer.kind === "rhythm") {
    // Musical time meets performed time, exactly as in a rhythm drill: the
    // expected onsets are ticks, the taps are audio-clock seconds, and the
    // grader is the one place they are matched.
    const scored = gradeRhythm({
      expectedTicks: expected.onsetTicks,
      playedSeconds: answer.onsetsSeconds,
      bpm: answer.bpm,
      transport: expected.transport,
    });
    return {
      correct: scored.onsetAccuracy === 1,
      score: scored.onsetAccuracy,
      summary: describeRhythm(scored, toleranceForTempo(answer.bpm)) ?? "Nothing landed yet.",
      rhythm: scored,
    };
  }

  if (expected.kind === "transcription" && answer.kind === "transcription") {
    const scored = scoreTranscription(expected.notes, answer.notes);
    return {
      correct: scored.isExact,
      score: scored.total,
      summary: scored.pitch.isExact
        ? scored.rhythmAccuracy === 1
          ? "Every note, in the right place."
          : "The right notes — some are on the wrong beat."
        : describeSequenceComparison(scored.pitch),
      comparison: scored.pitch,
      transcription: scored,
    };
  }

  return { correct: false, score: 0, summary: "That answer could not be graded." };
}

export function useEarSession({ family, mode, difficulty, onGraded }: EarSessionOptions): EarSessionView {
  const [seed, setSeed] = useState(newSeed);
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [result, setResult] = useState<EarResult | null>(null);
  const [hasEntered, setHasEntered] = useState(false);

  const definition = useMemo(() => exerciseRegistry.generate(family, { seed, difficulty }), [difficulty, family, seed]);

  // A new family or a new seed is a new question, so a stale verdict must not
  // survive into it.
  const questionKey = `${family}|${seed}`;
  const [lastQuestionKey, setLastQuestionKey] = useState(questionKey);
  if (questionKey !== lastQuestionKey) {
    setLastQuestionKey(questionKey);
    setResult(null);
    setReplaysUsed(0);
    setHasEntered(false);
  }

  const play = useCallback(() => {
    if (!definition) return;
    // The first play is not a replay; after that the policy applies.
    if (replaysUsed > 0 && !canReplay(mode, replaysUsed - 1, hasEntered)) return;
    playStimulus(definition.stimulus);
    setReplaysUsed((used) => used + 1);
  }, [definition, hasEntered, mode, replaysUsed]);

  const noteEntered = useCallback(() => setHasEntered(true), []);

  const submit = useCallback(
    (answer: EarAnswerInput) => {
      if (!definition || result) return;
      const graded = grade(definition, answer);
      setResult(graded);
      onGraded?.(graded, definition);
    },
    [definition, onGraded, result],
  );

  const next = useCallback(() => setSeed(newSeed()), []);

  return {
    definition,
    result,
    // A first listen is always available; the count that matters is replays.
    canPlay: replaysUsed === 0 || canReplay(mode, replaysUsed - 1, hasEntered),
    replaysLeft: describeReplays(mode, Math.max(0, replaysUsed - 1)),
    play,
    submit,
    next,
    noteEntered,
  };
}

// Turns a note id from the on-screen keyboard or a piano into a MIDI number.
export function midiForNoteId(noteId: string): number | undefined {
  return getPianoKeyById(noteId)?.midi;
}

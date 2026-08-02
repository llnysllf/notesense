// Running one Reading Score sitting.
//
// The assessment rules are fixed and deliberately unlike practice: no hints, no
// reveal, no correction, and no second chance at a note. The learner reads the
// passage once, and what they played is graded afterwards. Telling them they
// were wrong mid-passage would change the thing being measured — reading under
// your own steam is the skill.

import { useCallback, useEffect, useRef, useState } from "react";
import { startAssessmentClock, type AssessmentClock } from "../assessmentClock";
import { getPianoKeyById } from "../noteData";
import {
  buildAssessmentPassage,
  scoreReadingAssessment,
  ticksToSeconds,
  type AssessmentAnswer,
  type AssessmentPassage,
  type ReadingScoreResult,
} from "../types";

export type ReadingScoreRunStatus = "idle" | "count-in" | "running" | "complete";

export type UseReadingScoreRun = {
  passage: AssessmentPassage;
  status: ReadingScoreRunStatus;
  answeredCount: number;
  result: ReadingScoreResult | null;
  // False when audio was unavailable, so the screen can say the count-in is
  // silent instead of leaving the learner waiting for a click that never comes.
  isAudible: boolean;
  start: () => void;
  finish: () => void;
  play: (noteId: string) => void;
  nextForm: () => void;
};

export type ReadingScoreRunOptions = {
  difficulty: number;
  latencyMs?: number;
  onComplete?: (result: ReadingScoreResult, passage: AssessmentPassage) => void;
};

// A beat of grace after the last note, so a final note played slightly late is
// still part of the performance rather than lost to the clock.
const TAIL_BEATS = 1;

export function useReadingScoreRun({
  difficulty,
  latencyMs = 0,
  onComplete,
}: ReadingScoreRunOptions): UseReadingScoreRun {
  const [seed, setSeed] = useState(() => `${Date.now()}`);
  const [passage, setPassage] = useState<AssessmentPassage>(() => buildAssessmentPassage({ difficulty, seed }));
  const [status, setStatus] = useState<ReadingScoreRunStatus>("idle");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [result, setResult] = useState<ReadingScoreResult | null>(null);
  const [isAudible, setIsAudible] = useState(true);

  const clockRef = useRef<AssessmentClock | null>(null);
  const answersRef = useRef<AssessmentAnswer[]>([]);
  const endTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // The form is a function of the seed and the difficulty band, so it is rebuilt
  // during render when either changes rather than a frame later.
  const formKey = `${seed}|${difficulty}`;
  const [lastFormKey, setLastFormKey] = useState(formKey);
  if (formKey !== lastFormKey) {
    setLastFormKey(formKey);
    setPassage(buildAssessmentPassage({ difficulty, seed }));
    setStatus("idle");
    setAnsweredCount(0);
    setResult(null);
  }

  const cleanup = useCallback(() => {
    clockRef.current?.stop();
    clockRef.current = null;
    if (endTimerRef.current !== null) window.clearTimeout(endTimerRef.current);
    endTimerRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const finish = useCallback(() => {
    cleanup();
    setStatus((current) => (current === "idle" ? current : "complete"));

    // Notes never reached are still part of the passage: an abandoned run is a
    // low score, not a short passage that happened to be played perfectly.
    const answers: AssessmentAnswer[] = passage.notes.map(
      (note, index) => answersRef.current[index] ?? { expectedMidi: note.midi },
    );
    const scored = scoreReadingAssessment({ passage, answers, latencyMs });
    setResult(scored);
    onCompleteRef.current?.(scored, passage);
  }, [cleanup, latencyMs, passage]);

  const play = useCallback(
    (noteId: string) => {
      if (status !== "running") return;
      const index = answersRef.current.length;
      const expected = passage.notes[index];
      if (!expected) return;

      answersRef.current.push({
        expectedMidi: expected.midi,
        playedMidi: getPianoKeyById(noteId)?.midi ?? -1,
        playedSeconds: clockRef.current?.now() ?? 0,
      });
      setAnsweredCount(index + 1);
      // The last note ends the run: there is nothing left to read, and waiting
      // for the tail timer would leave the learner staring at a finished staff.
      if (index + 1 >= passage.notes.length) finish();
    },
    [finish, passage.notes, status],
  );

  const start = useCallback(() => {
    cleanup();
    answersRef.current = [];
    setAnsweredCount(0);
    setResult(null);
    setStatus("count-in");

    const clock = startAssessmentClock({
      bpm: passage.bpm,
      beatsPerBar: passage.meter.beats,
      onStart: () => setStatus("running"),
    });
    clockRef.current = clock;
    setIsAudible(clock.isAudible);

    const lengthSeconds = ticksToSeconds(passage.lengthTicks, passage.bpm, passage.transport);
    const tailSeconds = (60 / Math.max(1, passage.bpm)) * TAIL_BEATS;
    endTimerRef.current = window.setTimeout(
      finish,
      Math.max(0, clock.secondsUntilStart + lengthSeconds + tailSeconds) * 1000,
    );
  }, [cleanup, finish, passage]);

  const nextForm = useCallback(() => {
    cleanup();
    answersRef.current = [];
    setSeed(`${Date.now()}-${Math.round(performance.now())}`);
  }, [cleanup]);

  return { passage, status, answeredCount, result, isAudible, start, finish, play, nextForm };
}

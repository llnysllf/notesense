// Running a singing exercise.
//
// The shape of this hook is set by one rule: the frames a microphone produces
// live only as long as the take. They are collected in a ref while the learner
// sings, scored when they stop, and dropped. What survives is the derived
// `SungSummary` — five numbers — and nothing else reaches storage or the
// evidence ledger.
//
// Permission is asked for on the record button, never on load.

import { useCallback, useEffect, useRef, useState } from "react";
import { playTone } from "../audio";
import { getNoteFrequency } from "../noteData";
import { detectMicSupport, startListening, type MicSession, type MicStatus } from "../voice/microphone";
import { loadVocalRange, saveVocalRange } from "../storage";
import {
  buildContour,
  buildSingingExercise,
  deriveVocalRange,
  describeSinging,
  exerciseSeconds,
  midiToNoteId,
  scoreSinging,
  SINGING_STAGES,
  type PitchFrame,
  type SingingDrillView,
  type SingingStageId,
  type SungScore,
  type VocalRange,
} from "../types";

// Where a learner starts before they have calibrated: a comfortable middle,
// wide enough for the early stages and narrow enough that nothing is extreme.
const DEFAULT_RANGE: VocalRange = { version: 1, lowMidi: 55, highMidi: 69 };

function newSeed(): string {
  return `${Date.now()}-${Math.round(performance.now() * 1000)}`;
}

export function useSingingDrill(): SingingDrillView {
  const [support] = useState(() => detectMicSupport());
  const [status, setStatus] = useState<MicStatus>(() => (detectMicSupport() === "available" ? "idle" : "unavailable"));
  const [stageId, setStageId] = useState<SingingStageId>("match-one");
  const [seed, setSeed] = useState(newSeed);
  const [range, setRange] = useState<VocalRange | undefined>(() => loadVocalRange());
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState<SungScore | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Frames live here, never in state: they are working data for one take, not
  // something the app keeps or renders.
  const framesRef = useRef<PitchFrame[]>([]);
  const sessionRef = useRef<MicSession | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const exercise = buildSingingExercise({ stageId, range: range ?? DEFAULT_RANGE, seed });

  const cleanup = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
  }, []);

  // Releasing the microphone when the screen goes away is not optional: the
  // browser's recording indicator stays on until the tracks are stopped.
  useEffect(() => cleanup, [cleanup]);

  const finish = useCallback(() => {
    cleanup();
    setStatus((current) => (current === "listening" ? "idle" : current));
    setLevel(0);

    const contour = buildContour(framesRef.current);

    if (isCalibrating) {
      const derived = deriveVocalRange(contour);
      if (derived) {
        setRange(derived);
        saveVocalRange(derived);
      }
      setIsCalibrating(false);
    } else {
      setScore(scoreSinging({ targets: exercise.targets, contour }));
    }

    // The frames have done their job. Dropping them here is what makes "we do
    // not keep a recording" true of the running app, not just of storage.
    framesRef.current = [];
  }, [cleanup, exercise.targets, isCalibrating]);

  const listen = useCallback(
    (seconds: number) => {
      framesRef.current = [];
      setScore(null);
      setStatus("requesting");

      void startListening({
        onFrame: (frame) => {
          framesRef.current.push(frame);
          setLevel(frame.level);
        },
      }).then((session) => {
        if (!session) {
          setStatus("denied");
          return;
        }
        sessionRef.current = session;
        setStatus("listening");
        stopTimerRef.current = window.setTimeout(finish, seconds * 1000);
      });
    },
    [finish],
  );

  const playReference = useCallback(() => {
    const frequency = getNoteFrequency(midiToNoteId(exercise.referenceMidi));
    if (frequency !== undefined) playTone(frequency);
  }, [exercise.referenceMidi]);

  const start = useCallback(() => listen(exerciseSeconds(exercise)), [exercise, listen]);

  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    // Long enough to sweep comfortably low to comfortably high without rushing.
    listen(8);
  }, [listen]);

  const stop = useCallback(() => finish(), [finish]);

  return {
    support,
    status,
    stages: SINGING_STAGES,
    stageId,
    exercise,
    range,
    level,
    score,
    isCalibrating,
    feedback: score ? describeSinging(score) : undefined,
    setStage: (next) => {
      setStageId(next);
      setScore(null);
      setSeed(newSeed());
    },
    start,
    stop,
    startCalibration,
    playReference,
    next: () => {
      setScore(null);
      setSeed(newSeed());
    },
  };
}

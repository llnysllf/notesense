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
import { playMelody, playTone } from "../audio";
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
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [liveMidi, setLiveMidi] = useState<number | null>(null);

  // Frames live here, never in state: they are working data for one take, not
  // something the app keeps or renders.
  const framesRef = useRef<PitchFrame[]>([]);
  const sessionRef = useRef<MicSession | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const countdownTickRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const captureRef = useRef(false);
  const captureOriginRef = useRef<number | null>(null);
  // This belongs to the take, not to React's next render. A permission prompt
  // can resolve after a render, so finish must read the value captured when the
  // learner pressed the calibration button.
  const calibrationRef = useRef(false);

  const exercise = buildSingingExercise({ stageId, range: range ?? DEFAULT_RANGE, seed });

  const cleanup = useCallback(() => {
    // Invalidate a pending permission request too. If it resolves after Stop or
    // unmount, its stream is stopped in the promise continuation below.
    requestIdRef.current += 1;
    captureRef.current = false;
    captureOriginRef.current = null;
    sessionRef.current?.stop();
    sessionRef.current = null;
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    if (countdownTimerRef.current !== null) window.clearTimeout(countdownTimerRef.current);
    countdownTimerRef.current = null;
    if (countdownTickRef.current !== null) window.clearInterval(countdownTickRef.current);
    countdownTickRef.current = null;
  }, []);

  // Releasing the microphone when the screen goes away is not optional: the
  // browser's recording indicator stays on until the tracks are stopped.
  useEffect(() => cleanup, [cleanup]);

  const finish = useCallback(() => {
    cleanup();
    setStatus((current) => (current === "listening" || current === "requesting" ? "idle" : current));
    setLevel(0);
    setLiveMidi(null);
    setCountdownSeconds(null);

    const contour = buildContour(framesRef.current);

    if (calibrationRef.current) {
      const derived = deriveVocalRange(contour);
      if (derived) {
        setRange(derived);
        saveVocalRange(derived);
      }
      calibrationRef.current = false;
      setIsCalibrating(false);
    } else {
      setScore(scoreSinging({ targets: exercise.targets, contour }));
    }

    // The frames have done their job. Dropping them here is what makes "we do
    // not keep a recording" true of the running app, not just of storage.
    framesRef.current = [];
  }, [cleanup, exercise.targets]);

  const listen = useCallback(
    (seconds: number, calibration = false) => {
      cleanup();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      framesRef.current = [];
      calibrationRef.current = calibration;
      setScore(null);
      setCountdownSeconds(null);
      setLiveMidi(null);
      setStatus("requesting");

      void startListening({
        onFrame: (frame) => {
          setLevel(frame.level);
          setLiveMidi(frame.voiced ? frame.midi : null);
          if (!captureRef.current) return;
          captureOriginRef.current ??= frame.atSeconds;
          framesRef.current.push({ ...frame, atSeconds: frame.atSeconds - captureOriginRef.current });
        },
      }).then((session) => {
        // The learner may have pressed Stop (or left the route) while the
        // permission prompt was open. Never resurrect that abandoned session.
        if (requestId !== requestIdRef.current) {
          session?.stop();
          return;
        }
        if (!session) {
          setStatus("denied");
          return;
        }
        sessionRef.current = session;
        setStatus("listening");
        setCountdownSeconds(3);
        countdownTickRef.current = window.setInterval(() => {
          setCountdownSeconds((current) => (current && current > 1 ? current - 1 : current));
        }, 1000);
        countdownTimerRef.current = window.setTimeout(() => {
          if (countdownTickRef.current !== null) window.clearInterval(countdownTickRef.current);
          countdownTickRef.current = null;
          setCountdownSeconds(null);
          captureOriginRef.current = null;
          captureRef.current = true;
          if (exercise.accompaniment) {
            playMelody(
              exercise.targets.map((target) => getNoteFrequency(midiToNoteId(target.midi)) ?? 0),
              exercise.targets[0]?.durationSeconds ? exercise.targets[0].durationSeconds * 0.85 : 0.85,
              exercise.targets[0]?.durationSeconds ?? 1,
            );
          }
          stopTimerRef.current = window.setTimeout(finish, seconds * 1000);
        }, 3000);
      });
    },
    [cleanup, exercise.accompaniment, exercise.targets, finish],
  );

  const playReference = useCallback(() => {
    const frequency = getNoteFrequency(midiToNoteId(exercise.referenceMidi));
    if (frequency !== undefined) playTone(frequency);
  }, [exercise.referenceMidi]);

  const playPrompt = useCallback(() => {
    playMelody(exercise.targets.map((target) => getNoteFrequency(midiToNoteId(target.midi)) ?? 0));
  }, [exercise.targets]);

  const start = useCallback(() => {
    setIsCalibrating(false);
    listen(exerciseSeconds(exercise));
  }, [exercise, listen]);

  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    // Long enough to sweep comfortably low to comfortably high without rushing.
    listen(8, true);
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
    countdownSeconds,
    liveMidi,
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
    playPrompt,
    next: () => {
      setScore(null);
      setSeed(newSeed());
    },
  };
}

// The derived pitch contour: what the app keeps after listening.
//
// This is the privacy boundary in data form. A frame here holds a time, a
// pitch, and a confidence — never a sample. Raw audio is consumed by the
// detector and discarded inside the audio callback, so there is no point later
// in the pipeline where it could be persisted or sent, because it no longer
// exists to persist or send.
//
// The two corrections applied here are the ones a raw detector always needs:
// single-frame spikes, and octave errors. Both are repaired against neighbours
// rather than against the target, so the contour never quietly bends toward the
// answer.

export type PitchFrame = {
  atSeconds: number;
  // Fractional MIDI. Zero when unvoiced.
  midi: number;
  confidence: number;
  voiced: boolean;
  level: number;
};

const OCTAVE = 12;
// A jump this close to a whole octave, with neighbours agreeing, is the
// detector's error rather than the singer's.
const OCTAVE_TOLERANCE = 1.5;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number);
}

// Folds a frame that sits an octave away from its neighbours back where it
// belongs. Checked against the neighbours' median so one bad frame cannot drag
// a whole phrase.
function repairOctaves(frames: readonly PitchFrame[]): PitchFrame[] {
  const voiced = frames.filter((frame) => frame.voiced).map((frame) => frame.midi);
  if (voiced.length < 3) return [...frames];
  const centre = median(voiced);

  return frames.map((frame) => {
    if (!frame.voiced) return frame;
    const distance = frame.midi - centre;
    const octaves = Math.round(distance / OCTAVE);
    if (octaves === 0) return frame;
    if (Math.abs(distance - octaves * OCTAVE) > OCTAVE_TOLERANCE) return frame;
    return { ...frame, midi: frame.midi - octaves * OCTAVE };
  });
}

// A three-frame median: enough to remove a single wild frame, short enough that
// vibrato — which oscillates over many frames — passes through untouched.
// A longer window would flatten vibrato into "unsteady", which is exactly the
// mistake this whole module exists to avoid.
function despike(frames: readonly PitchFrame[]): PitchFrame[] {
  if (frames.length < 3) return [...frames];
  return frames.map((frame, index) => {
    if (index === 0 || index === frames.length - 1 || !frame.voiced) return frame;
    const previous = frames[index - 1] as PitchFrame;
    const next = frames[index + 1] as PitchFrame;
    if (!previous.voiced || !next.voiced) return frame;
    return { ...frame, midi: median([previous.midi, frame.midi, next.midi]) };
  });
}

export type ContourOptions = {
  // Frames below this confidence are treated as unvoiced rather than trusted.
  minConfidence?: number;
};

const MIN_CONFIDENCE = 0.6;

// Cleans a raw frame series into the contour everything downstream reads.
export function buildContour(frames: readonly PitchFrame[], options: ContourOptions = {}): PitchFrame[] {
  const { minConfidence = MIN_CONFIDENCE } = options;
  const gated = frames.map((frame) =>
    frame.voiced && frame.confidence >= minConfidence ? frame : { ...frame, voiced: false, midi: 0 },
  );
  return despike(repairOctaves(gated));
}

export function voicedFrames(contour: readonly PitchFrame[]): PitchFrame[] {
  return contour.filter((frame) => frame.voiced);
}

// The pitch a stretch of singing sat at. Median rather than mean, so one
// scooped entry does not move it.
export function centreMidi(contour: readonly PitchFrame[]): number {
  return median(voicedFrames(contour).map((frame) => frame.midi));
}

// A slow-moving centre line, used to judge steadiness without judging vibrato.
// Vibrato is a periodic wobble of roughly 5–7Hz; averaging over a window longer
// than one cycle leaves the centre and removes the wobble, so what remains is
// drift — which is what "steady" actually means.
export const CENTRE_WINDOW_SECONDS = 0.25;

export function centreLine(contour: readonly PitchFrame[], windowSeconds = CENTRE_WINDOW_SECONDS): number[] {
  const voiced = voicedFrames(contour);
  return voiced.map((frame) => {
    const nearby = voiced.filter((other) => Math.abs(other.atSeconds - frame.atSeconds) <= windowSeconds / 2);
    return median(nearby.map((entry) => entry.midi));
  });
}

// Where the singer started each sustained note, in seconds. An onset is a
// voiced frame that follows silence, or a move of more than a semitone that
// then holds — a scoop within a note is not a new note.
export const ONSET_JUMP_SEMITONES = 1;

export function onsetSeconds(contour: readonly PitchFrame[]): number[] {
  const onsets: number[] = [];
  let previous: PitchFrame | undefined;

  for (const frame of contour) {
    if (!frame.voiced) {
      previous = undefined;
      continue;
    }
    if (!previous || Math.abs(frame.midi - previous.midi) > ONSET_JUMP_SEMITONES) {
      onsets.push(frame.atSeconds);
    }
    previous = frame;
  }
  return onsets;
}

// The theory vocabulary ear training asks about: intervals, chord qualities,
// scales and modes, and cadences.
//
// Held as data rather than as branching code, so a generator picks a row and an
// answer screen renders the same row's label. That keeps the thing being asked
// and the thing being shown from drifting apart, which is the usual way an ear
// exercise ends up marking a right answer wrong.
//
// Everything here is intervals in semitones above a root. Nothing is spelled,
// because these exercises are about what a learner hears, and a heard minor
// sixth and augmented fifth are the same sound.

export type IntervalId =
  | "unison"
  | "minor-2nd"
  | "major-2nd"
  | "minor-3rd"
  | "major-3rd"
  | "perfect-4th"
  | "tritone"
  | "perfect-5th"
  | "minor-6th"
  | "major-6th"
  | "minor-7th"
  | "major-7th"
  | "octave";

export type Interval = { id: IntervalId; semitones: number; label: string };

export const INTERVALS: readonly Interval[] = [
  { id: "unison", semitones: 0, label: "Unison" },
  { id: "minor-2nd", semitones: 1, label: "Minor 2nd" },
  { id: "major-2nd", semitones: 2, label: "Major 2nd" },
  { id: "minor-3rd", semitones: 3, label: "Minor 3rd" },
  { id: "major-3rd", semitones: 4, label: "Major 3rd" },
  { id: "perfect-4th", semitones: 5, label: "Perfect 4th" },
  { id: "tritone", semitones: 6, label: "Tritone" },
  { id: "perfect-5th", semitones: 7, label: "Perfect 5th" },
  { id: "minor-6th", semitones: 8, label: "Minor 6th" },
  { id: "major-6th", semitones: 9, label: "Major 6th" },
  { id: "minor-7th", semitones: 10, label: "Minor 7th" },
  { id: "major-7th", semitones: 11, label: "Major 7th" },
  { id: "octave", semitones: 12, label: "Octave" },
];

export function intervalBySemitones(semitones: number): Interval | undefined {
  return INTERVALS.find((interval) => interval.semitones === Math.abs(semitones));
}

export type ChordQualityId =
  "major" | "minor" | "diminished" | "augmented" | "dominant-7th" | "major-7th" | "minor-7th";

export type ChordQuality = { id: ChordQualityId; semitones: readonly number[]; label: string };

export const CHORD_QUALITIES: readonly ChordQuality[] = [
  { id: "major", semitones: [0, 4, 7], label: "Major" },
  { id: "minor", semitones: [0, 3, 7], label: "Minor" },
  { id: "diminished", semitones: [0, 3, 6], label: "Diminished" },
  { id: "augmented", semitones: [0, 4, 8], label: "Augmented" },
  { id: "dominant-7th", semitones: [0, 4, 7, 10], label: "Dominant 7th" },
  { id: "major-7th", semitones: [0, 4, 7, 11], label: "Major 7th" },
  { id: "minor-7th", semitones: [0, 3, 7, 10], label: "Minor 7th" },
];

export type ScaleId = "major" | "natural-minor" | "harmonic-minor" | "dorian" | "mixolydian" | "pentatonic-major";

export type Scale = { id: ScaleId; semitones: readonly number[]; label: string };

export const SCALES: readonly Scale[] = [
  { id: "major", semitones: [0, 2, 4, 5, 7, 9, 11, 12], label: "Major" },
  { id: "natural-minor", semitones: [0, 2, 3, 5, 7, 8, 10, 12], label: "Natural minor" },
  { id: "harmonic-minor", semitones: [0, 2, 3, 5, 7, 8, 11, 12], label: "Harmonic minor" },
  { id: "dorian", semitones: [0, 2, 3, 5, 7, 9, 10, 12], label: "Dorian" },
  { id: "mixolydian", semitones: [0, 2, 4, 5, 7, 9, 10, 12], label: "Mixolydian" },
  { id: "pentatonic-major", semitones: [0, 2, 4, 7, 9, 12], label: "Major pentatonic" },
];

export type CadenceId = "authentic" | "plagal" | "half" | "deceptive";

// Cadences are two chords, each a set of semitone offsets from the key's tonic.
// Written out rather than derived from roman numerals, because what a learner
// hears is the voicing, and deriving it would invite a generator and a label
// that disagree.
export type Cadence = { id: CadenceId; chords: readonly (readonly number[])[]; label: string };

export const CADENCES: readonly Cadence[] = [
  {
    id: "authentic",
    chords: [
      [7, 11, 14],
      [0, 4, 7],
    ],
    label: "Perfect (V–I)",
  },
  {
    id: "plagal",
    chords: [
      [5, 9, 12],
      [0, 4, 7],
    ],
    label: "Plagal (IV–I)",
  },
  {
    id: "half",
    chords: [
      [0, 4, 7],
      [7, 11, 14],
    ],
    label: "Half (I–V)",
  },
  {
    id: "deceptive",
    chords: [
      [7, 11, 14],
      [9, 12, 16],
    ],
    label: "Deceptive (V–vi)",
  },
];

// Sounding pitches for a chord quality rooted at a MIDI note.
export function chordMidi(rootMidi: number, quality: ChordQuality): number[] {
  return quality.semitones.map((semitone) => rootMidi + semitone);
}

// Sounding pitches for a scale from a tonic, ascending.
export function scaleMidi(tonicMidi: number, scale: Scale): number[] {
  return scale.semitones.map((semitone) => tonicMidi + semitone);
}

// The two chords of a cadence in a key, flattened in playback order.
export function cadenceMidi(tonicMidi: number, cadence: Cadence): number[][] {
  return cadence.chords.map((chord) => chord.map((semitone) => tonicMidi + semitone));
}

// Competencies: what a learner can do. Kept deliberately separate from content
// dimensions (the material/conditions) and difficulty, so mastery is computed
// as competency x dimensions rather than as one giant enum of every
// combination. Only reading and pitch/ear competencies have generators today;
// the rest are declared so prerequisites and later slices have stable ids.

export type CompetencyDomain = "reading" | "rhythm" | "ear" | "voice";

export type CompetencyId =
  | "reading.pitch.staff-to-key"
  | "reading.pitch.key-to-staff"
  | "reading.interval.horizontal"
  | "reading.look-ahead"
  | "rhythm.pulse"
  | "rhythm.duration"
  | "rhythm.syncopation"
  | "ear.pitch.absolute-anchor"
  | "ear.interval.melodic"
  | "ear.sequence.transcription"
  | "voice.pitch-match"
  | "voice.sight-sing";

export type Competency = {
  id: CompetencyId;
  domain: CompetencyDomain;
  label: string;
  summary: string;
};

export const COMPETENCIES: readonly Competency[] = [
  {
    id: "reading.pitch.staff-to-key",
    domain: "reading",
    label: "Staff to key",
    summary: "Read a notated pitch and find it on the keyboard.",
  },
  {
    id: "reading.pitch.key-to-staff",
    domain: "reading",
    label: "Key to staff",
    summary: "Recognize which notated pitch a key produces.",
  },
  {
    id: "reading.interval.horizontal",
    domain: "reading",
    label: "Interval reading",
    summary: "Read steps and skips between successive notes.",
  },
  {
    id: "reading.look-ahead",
    domain: "reading",
    label: "Look ahead",
    summary: "Read the current note while previewing the next.",
  },
  { id: "rhythm.pulse", domain: "rhythm", label: "Pulse", summary: "Keep a steady beat." },
  { id: "rhythm.duration", domain: "rhythm", label: "Duration reading", summary: "Read and reproduce note durations." },
  { id: "rhythm.syncopation", domain: "rhythm", label: "Syncopation", summary: "Read off-beat and tied rhythms." },
  {
    id: "ear.pitch.absolute-anchor",
    domain: "ear",
    label: "Pitch anchor",
    summary: "Identify a heard pitch against a reference.",
  },
  {
    id: "ear.interval.melodic",
    domain: "ear",
    label: "Melodic interval",
    summary: "Identify the interval between two heard pitches.",
  },
  {
    id: "ear.sequence.transcription",
    domain: "ear",
    label: "Transcription",
    summary: "Write down a heard sequence of pitches.",
  },
  { id: "voice.pitch-match", domain: "voice", label: "Pitch match", summary: "Sing a single target pitch in tune." },
  { id: "voice.sight-sing", domain: "voice", label: "Sight-sing", summary: "Sing a short notated passage." },
];

export const COMPETENCY_IDS: readonly CompetencyId[] = /* @__PURE__ */ COMPETENCIES.map((competency) => competency.id);

const BY_ID = /* @__PURE__ */ new Map<CompetencyId, Competency>(
  /* @__PURE__ */ COMPETENCIES.map((competency) => [competency.id, competency]),
);

export function isCompetencyId(value: unknown): value is CompetencyId {
  return typeof value === "string" && BY_ID.has(value as CompetencyId);
}

export function getCompetency(id: CompetencyId): Competency | undefined {
  return BY_ID.get(id);
}

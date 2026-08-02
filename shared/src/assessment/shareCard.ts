// What a shared Reading Score card says.
//
// The card is drawn locally and never uploaded, so the privacy question is not
// "where does it go" but "what is on it". That is answered structurally: this
// function cannot read a name, an id, or a device, because it is not given the
// record — only the handful of fields a result card legitimately shows. Adding
// anything personal would have to be a deliberate change to this signature.
//
// The date is day-precision for the same reason: a timestamp says when someone
// was at their instrument, which is not information a shared image needs.

import { type DifficultyBand } from "../curriculum/difficulty";
import { type ReadingScoreRecord } from "./history";
import { type ReadingScoreComponents } from "./readingScore";

// The only fields a share card is allowed to see. Everything identifying — the
// record id, the form seed, the device — is absent by construction.
export type ShareCardInput = Pick<
  ReadingScoreRecord,
  "score" | "band" | "components" | "recordedAtIso" | "isProvisional" | "inputSource"
>;

export type ShareCardLine = { label: string; value: string };

export type ShareCardContent = {
  title: string;
  scoreText: string;
  // Empty once the algorithm is calibrated; until then the card says so itself,
  // because a screenshot outlives the screen that explained the caveat.
  qualifier: string;
  subtitle: string;
  lines: ShareCardLine[];
  dateText: string;
  footnote: string;
};

const BAND_LABELS: Record<DifficultyBand, string> = {
  intro: "Intro",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const COMPONENT_LABELS: Record<keyof ReadingScoreComponents, string> = {
  noteAccuracy: "Notes",
  rhythmAccuracy: "Rhythm",
  continuity: "Continuity",
  fluency: "Fluency",
};

const INPUT_LABELS: Record<string, string> = {
  touch: "on screen",
  "computer-keyboard": "on a computer keyboard",
  midi: "on a piano",
  microphone: "by ear",
  unknown: "",
};

function percent(value: number): string {
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}

export function buildShareCard(input: ShareCardInput): ShareCardContent {
  const played = INPUT_LABELS[input.inputSource] ?? "";
  const subtitle = [`${BAND_LABELS[input.band]} difficulty`, played].filter((part) => part.length > 0).join(" · ");

  return {
    title: "NoteSense Reading Score",
    scoreText: String(input.score),
    qualifier: input.isProvisional ? "Provisional — not a standardized score" : "",
    subtitle,
    lines: (Object.keys(COMPONENT_LABELS) as (keyof ReadingScoreComponents)[]).map((key) => ({
      label: COMPONENT_LABELS[key],
      value: percent(input.components[key]),
    })),
    // Day precision only, and taken from the record rather than from the clock.
    dateText: input.recordedAtIso.slice(0, 10),
    footnote: "notesense",
  };
}

// The same content as one sentence, for a screen reader and for the image's
// alt text. A picture of a result is not a result unless it can be read aloud.
export function shareCardAltText(content: ShareCardContent): string {
  const components = content.lines.map((line) => `${line.label} ${line.value}`).join(", ");
  const qualifier = content.qualifier.length > 0 ? ` ${content.qualifier}.` : "";
  return `${content.title}: ${content.scoreText}. ${content.subtitle}, ${content.dateText}. ${components}.${qualifier}`;
}

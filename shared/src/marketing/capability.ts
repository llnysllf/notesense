// What the product can actually do, in the words a public page is allowed to use.
//
// The point of putting this here rather than in page copy is that a claim and
// the thing it claims can then be checked against each other. Every capability
// names the destination a visitor lands on to use it; if that destination is not
// in the shipped route table, the claim fails a test rather than quietly
// becoming a lie on the home page. A marketing site that drifts ahead of its
// product is the normal outcome, and this is the cheapest way to prevent it.
//
// The wording is deliberately plain. "Practice reading notes on a staff" is
// checkable against the app; "unlock your musical potential" is not.

export type CapabilityId =
  | "reading"
  | "pitch"
  | "rhythm"
  | "ear"
  | "singing"
  | "songs"
  | "import"
  | "placement"
  | "reading-score"
  | "progress"
  | "midi"
  | "sound"
  | "offline";

export type Capability = {
  id: CapabilityId;
  label: string;
  // One sentence a public page may print, stated as something a learner does.
  claim: string;
  detail: string;
  // Where a visitor goes to use it. Undefined only for capabilities that are
  // properties of the whole app rather than a destination.
  routePath?: string;
  // The module that makes the claim true. Read by a human during review; the
  // route check is what a machine can verify.
  evidence: string;
  // The phrase docs/PRODUCT_SCOPE.md must use for this while it ships. The
  // scope contract drifted for four slices — listing MIDI import and Web MIDI
  // input as explicitly out of scope after both had shipped — because nothing
  // compared the document to the product. `npm run product:check` now does.
  scopeTerm: string;
};

export const CAPABILITIES: readonly Capability[] = [
  {
    id: "reading",
    label: "Note reading",
    claim: "Read notes on a staff and answer on a piano keyboard.",
    detail:
      "Treble, bass, and grand staff, in four modes: Learn shows you the answer, Practice adapts to your weak notes, Test is a fixed set, and Custom is yours to set.",
    routePath: "/practice/reading",
    evidence: "shared/src/reading/readingMode.ts",
    scopeTerm: "note reading",
  },
  {
    id: "pitch",
    label: "Pitch training",
    claim: "Hear a note and find it by ear.",
    detail: "Single notes or sequences of three to sixteen, across any range from naturals to all 88 keys.",
    routePath: "/practice/pitch",
    evidence: "shared/src/practiceSettings.ts",
    scopeTerm: "pitch training",
  },
  {
    id: "rhythm",
    label: "Rhythm",
    claim: "Tap a rhythm against a metronome and see where you were early or late.",
    detail: "Generated patterns in several rhythmic vocabularies, graded on timing rather than on hitting a target.",
    routePath: "/practice/rhythm",
    evidence: "shared/src/rhythm/pattern.ts",
    scopeTerm: "rhythm drills",
  },
  {
    id: "ear",
    label: "Ear training",
    claim: "Name intervals, chords, scales, and cadences by ear.",
    detail: "Or write down what you heard, note by note, on a staff you can undo.",
    routePath: "/practice/ear",
    evidence: "shared/src/ear/theory.ts",
    scopeTerm: "ear training",
  },
  {
    id: "singing",
    label: "Singing",
    claim: "Sing a phrase and see how close you were.",
    detail: "Pitch, steadiness, and timing are measured in the browser. No audio is recorded, saved, or sent anywhere.",
    routePath: "/practice/singing",
    evidence: "shared/src/voice/pitchDetect.ts",
    scopeTerm: "singing",
  },
  {
    id: "songs",
    label: "Songs",
    claim: "Play through real pieces at your own pace.",
    detail: "A built-in library of public-domain music, with your best accuracy kept per song.",
    routePath: "/practice/songs",
    evidence: "shared/src/songData.ts",
    scopeTerm: "song library",
  },
  {
    id: "import",
    label: "Your own music",
    claim: "Bring in a MIDI file and practice from it.",
    detail: "The file is read in your browser and never uploaded. Pick a track, a hand, and a quantize grid.",
    routePath: "/practice/import",
    evidence: "shared/src/import/midiFile.ts",
    scopeTerm: "MIDI import",
  },
  {
    id: "placement",
    label: "Placement",
    claim: "Find out where to start, in about two minutes.",
    detail: "A short adaptive check that suggests a starting point and never overrides real practice evidence.",
    routePath: "/assess/placement",
    evidence: "shared/src/assessment/placement.ts",
    scopeTerm: "placement check",
  },
  {
    id: "reading-score",
    label: "Reading Score",
    claim: "Take a timed sight-reading measurement you can repeat.",
    detail:
      "Accuracy, pace, and coverage on unseen passages, kept apart from practice so the next sitting stays unseen.",
    routePath: "/assess/reading-score",
    evidence: "shared/src/assessment/readingScore.ts",
    scopeTerm: "Reading Score",
  },
  {
    id: "progress",
    label: "Progress",
    claim: "See which notes you actually know, and which you only sometimes get.",
    detail: "A mastery map, session history, and a daily plan built from what you have practised.",
    routePath: "/progress",
    evidence: "shared/src/evidence/mastery.ts",
    scopeTerm: "mastery map",
  },
  {
    id: "midi",
    label: "Digital piano",
    claim: "Play on your own piano over USB.",
    detail: "Web MIDI input, where the browser supports it. A mouse, a touchscreen, or a keyboard works too.",
    routePath: "/settings",
    evidence: "shared/src/midi/adapter.ts",
    scopeTerm: "Web MIDI input",
  },
  {
    id: "sound",
    label: "Sound",
    claim: "Choose the voice you practise with.",
    detail: "Four built-in tones, all synthesized in the browser, so there is nothing to download.",
    routePath: "/settings",
    evidence: "shared/src/sound/registry.ts",
    scopeTerm: "sound worlds",
  },
  {
    id: "offline",
    label: "Local-first",
    claim: "Works offline, keeps your practice on your device, and needs no account.",
    detail: "Nothing is uploaded. Your progress is yours to export as a file whenever you want.",
    evidence: "docs/DATA_CONTRACT.md",
    scopeTerm: "offline practice",
  },
];

const BY_ID = new Map<CapabilityId, Capability>(CAPABILITIES.map((capability) => [capability.id, capability]));

export function capabilityById(id: CapabilityId): Capability | undefined {
  return BY_ID.get(id);
}

// Which capabilities are actually reachable, given the destinations the app
// ships. Passed in rather than imported so this stays framework-free and so a
// test can ask what the site would say if a screen were removed.
export function shippedCapabilities(routePaths: readonly string[]): readonly Capability[] {
  const paths = new Set(routePaths);
  return CAPABILITIES.filter((capability) => capability.routePath === undefined || paths.has(capability.routePath));
}

type AttemptTiming = { wallIso: string; clock: number } | null;

function persistEvidence(
  options: Parameters<Awaited<typeof import("../evidenceLedger")>["createLiveAttemptEvent"]>[0],
) {
  void import("../evidenceLedger").then(({ createLiveAttemptEvent, recordEvidenceAttempt }) =>
    recordEvidenceAttempt(createLiveAttemptEvent(options)),
  );
}

function timingForAttempt(timing: AttemptTiming, answeredAt: Date, parts = 1) {
  return {
    startedAtIso: timing?.wallIso ?? answeredAt.toISOString(),
    answeredAtIso: answeredAt.toISOString(),
    responseMs: timing ? (performance.now() - timing.clock) / parts : 0,
  };
}

export function captureSingleEvidenceAttempt(options: {
  timing: AttemptTiming;
  sessionId: string;
  mode: "reading" | "pitch";
  promptId: string;
  correct: boolean;
  answerMidi?: number;
}) {
  const answeredAt = new Date();
  persistEvidence({
    sessionId: options.sessionId || `session-${answeredAt.getTime()}`,
    exerciseId: options.mode === "reading" ? "reading.staff-to-key" : "ear.pitch.absolute-anchor",
    promptId: options.promptId,
    ...timingForAttempt(options.timing, answeredAt),
    competencyId: options.mode === "reading" ? "reading.pitch.staff-to-key" : "ear.pitch.absolute-anchor",
    correct: options.correct,
    ...(options.answerMidi === undefined ? {} : { answerMidi: options.answerMidi }),
  });
}

export function captureMelodyEvidenceAttempts(options: {
  timing: AttemptTiming;
  sessionId: string;
  notes: readonly { id: string }[];
  answerNoteIds: readonly string[];
  answerMidis: readonly (number | undefined)[];
}) {
  const answeredAt = new Date();
  options.notes.forEach((note, index) => {
    const answerMidi = options.answerMidis[index];
    persistEvidence({
      sessionId: options.sessionId || `session-${answeredAt.getTime()}`,
      exerciseId: "ear.pitch.melody",
      promptId: `${note.id}-${index}`,
      ...timingForAttempt(options.timing, answeredAt, options.notes.length),
      competencyId: "ear.pitch.absolute-anchor",
      correct: options.answerNoteIds[index] === note.id,
      ...(answerMidi === undefined ? {} : { answerMidi }),
    });
  });
}

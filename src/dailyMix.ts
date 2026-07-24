import { getFocusItems } from "./practiceEngine";
import { compareSongsByDifficulty, getSongDifficulty } from "./storage";
import { READING_RANGES, PITCH_RANGES } from "./noteData";
import type {
  DailyMix,
  MixSegment,
  MixSegmentRole,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  Song,
  SongDifficulty,
  SongProgress,
} from "./types";

// The built-in song catalog is passed in (not imported) so this generator
// stays out of the initial bundle — the caller dynamically loads the catalog
// on the Today route. See docs/PERFORMANCE.md.

// Pure Daily Mix generator. Framework-free like practiceEngine.ts: given the
// learner's progress and settings, it composes a fixed three-part workout —
// one weak-spot drill, one review drill on the other mode, and one song for
// fun — reusing existing focus/mastery signals and the built-in song library.
// The mix is deterministic per UTC day so it stays stable within a day and
// rotates the next day.

const REWARD_POOL_SIZE = 15;
const SONG_SECONDS_PER_EVENT = 1.5;
const MIN_SONG_SECONDS = 30;

const DIFFICULTY_LABEL: Record<SongDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function getDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// Small deterministic RNG so a day's mix is reproducible from its day key.
function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The settings range is always one of the catalog ranges, so a match is
// guaranteed and the lookup carries no fallback branch.
function readingRangeDetail(range: PracticeSettings["readingRange"]): string {
  return READING_RANGES.find((entry) => entry.id === range)!.detail;
}

function pitchRangeDetail(range: PracticeSettings["pitchRange"]): string {
  return PITCH_RANGES.find((entry) => entry.id === range)!.detail;
}

function buildReadingSegment(
  role: MixSegmentRole,
  dayKey: string,
  settings: PracticeSettings,
  weakNoteIds: string[],
): MixSegment {
  const detail =
    role === "weakness" && weakNoteIds.length > 0
      ? `${readingRangeDetail(settings.readingRange)} · focus ${weakNoteIds.join(", ")}`
      : readingRangeDetail(settings.readingRange);

  return {
    id: `${dayKey}-${role}`,
    role,
    title: "Note reading",
    detail,
    estimatedSeconds: settings.roundLength,
    target: {
      activity: "reading",
      readingRange: settings.readingRange,
      customReadingRange: settings.customReadingRange,
    },
  };
}

function buildPitchSegment(
  role: MixSegmentRole,
  dayKey: string,
  settings: PracticeSettings,
  weakNoteIds: string[],
): MixSegment {
  const detail =
    role === "weakness" && weakNoteIds.length > 0
      ? `${pitchRangeDetail(settings.pitchRange)} · focus ${weakNoteIds.join(", ")}`
      : pitchRangeDetail(settings.pitchRange);

  return {
    id: `${dayKey}-${role}`,
    role,
    title: "Pitch training",
    detail,
    estimatedSeconds: settings.roundLength,
    // A weak-spot / review pitch drill trains single notes, not sequences.
    target: {
      activity: "pitch",
      pitchRange: settings.pitchRange,
      pitchExercise: "single",
      customPitchRange: settings.customPitchRange,
    },
  };
}

function buildRewardSegment(dayKey: string, songProgress: SongProgress, rng: () => number, songs: Song[]): MixSegment {
  const notCompleted = songs.filter((song) => !(songProgress[song.id]?.completions ?? 0));
  const base =
    notCompleted.length > 0
      ? notCompleted
      : [...songs].sort((a, b) =>
          (songProgress[a.id]?.lastPlayedAt ?? "").localeCompare(songProgress[b.id]?.lastPlayedAt ?? ""),
        );

  const easiest = [...base].sort(compareSongsByDifficulty).slice(0, REWARD_POOL_SIZE);
  const song = easiest[Math.floor(rng() * easiest.length)] ?? songs[0]!;

  return {
    id: `${dayKey}-reward`,
    role: "reward",
    title: song.title,
    detail: `Song · ${DIFFICULTY_LABEL[getSongDifficulty(song)]}`,
    estimatedSeconds: Math.max(MIN_SONG_SECONDS, Math.round(song.events.length * SONG_SECONDS_PER_EVENT)),
    target: { activity: "song", songId: song.id },
  };
}

export type GenerateDailyMixInput = {
  progress: PracticeProgress;
  songProgress: SongProgress;
  settings: PracticeSettings;
  songs: Song[];
  now?: Date;
};

export function generateDailyMix({
  progress,
  songProgress,
  settings,
  songs,
  now = new Date(),
}: GenerateDailyMixInput): DailyMix {
  const dayKey = getDayKey(now);
  const rng = mulberry32(hashString(dayKey));

  const readingFocus = getFocusItems("reading", progress.reading, settings.readingRange, settings.customReadingRange);
  const pitchFocus = getFocusItems(
    "pitch",
    progress.pitch,
    undefined,
    undefined,
    settings.pitchRange,
    settings.customPitchRange,
  );
  const readingWeakest = readingFocus[0];
  const pitchWeakest = pitchFocus[0];

  // Weak spot = whichever mode's weakest attempted note has the lower accuracy;
  // a brand-new learner (no attempts either side) warms up on reading.
  const weaknessMode: PracticeMode =
    pitchWeakest && (!readingWeakest || pitchWeakest.accuracy < readingWeakest.accuracy) ? "pitch" : "reading";

  const readingWeakIds = readingFocus.map((item) => item.note.id);
  const pitchWeakIds = pitchFocus.map((item) => item.note.id);

  const weaknessSegment =
    weaknessMode === "reading"
      ? buildReadingSegment("weakness", dayKey, settings, readingWeakIds)
      : buildPitchSegment("weakness", dayKey, settings, pitchWeakIds);

  // Review keeps the other mode fresh.
  const reviewSegment =
    weaknessMode === "reading"
      ? buildPitchSegment("review", dayKey, settings, pitchWeakIds)
      : buildReadingSegment("review", dayKey, settings, readingWeakIds);

  return {
    dayKey,
    generatedAt: now.toISOString(),
    segments: [weaknessSegment, reviewSegment, buildRewardSegment(dayKey, songProgress, rng, songs)],
    completedSegmentIds: [],
  };
}

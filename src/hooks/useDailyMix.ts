import { useCallback, useEffect, useRef, useState } from "react";
import { generateDailyMix, getDayKey } from "../dailyMix";
import { loadDailyMix, saveDailyMix } from "../storage";
import type { SongSessionStatus } from "../songEngine";
import type {
  DailyMix,
  MixSegment,
  MixTarget,
  PracticeMode,
  PracticeProgress,
  PracticeSettings,
  SessionSummary,
  Song,
  SongProgress,
} from "../types";

// The 200+ song catalog is loaded dynamically (not statically imported) so it
// stays in a deferred chunk instead of the initial bundle; the mix is null for
// the brief moment before that chunk resolves on the Today route.
const loadSongCatalog = () => import("../songLibraryData");

export type UseDailyMixOptions = {
  progress: PracticeProgress;
  songProgress: SongProgress;
  settings: PracticeSettings;
  // Completion signals reused from the running drill / song sessions.
  lastSummary: SessionSummary | null;
  songStatus: SongSessionStatus;
  onConfigureDrill: (mode: PracticeMode, patch: Partial<PracticeSettings>) => void;
  onOpenSong: (song: Song) => void;
  onNavigate: (section: "practice" | "songs") => void;
};

export type UseDailyMixResult = {
  mix: DailyMix | null;
  startSegment: (segment: MixSegment) => void;
  regenerate: () => void;
};

export function useDailyMix(options: UseDailyMixOptions): UseDailyMixResult {
  const { progress, songProgress, settings, lastSummary, songStatus, onConfigureDrill, onOpenSong, onNavigate } =
    options;

  // Generation reads the freshest progress/settings from refs updated after
  // each render, so the callbacks below stay stable.
  const inputsRef = useRef({ progress, songProgress, settings });
  useEffect(() => {
    inputsRef.current = { progress, songProgress, settings };
  });

  const [mix, setMix] = useState<DailyMix | null>(() => {
    const stored = loadDailyMix();
    return stored && stored.dayKey === getDayKey(new Date()) ? stored : null;
  });

  const mixRef = useRef(mix);
  useEffect(() => {
    mixRef.current = mix;
  });

  const activeSegmentRef = useRef<{ id: string; activity: MixTarget["activity"] } | null>(null);

  const regenerate = useCallback(async () => {
    const { BUILT_IN_SONGS } = await loadSongCatalog();
    const fresh = generateDailyMix({ ...inputsRef.current, songs: BUILT_IN_SONGS });
    saveDailyMix(fresh);
    activeSegmentRef.current = null;
    setMix(fresh);
  }, []);

  // Generate today's mix on first load when nothing is cached for today.
  useEffect(() => {
    if (mix === null) void regenerate();
  }, [mix, regenerate]);

  // Roll the mix over when the calendar day changes while the app stays open.
  useEffect(() => {
    const ensureToday = () => {
      const current = mixRef.current;
      if (current && current.dayKey !== getDayKey(new Date())) void regenerate();
    };

    window.addEventListener("focus", ensureToday);
    return () => window.removeEventListener("focus", ensureToday);
  }, [regenerate]);

  const startSegment = useCallback(
    (segment: MixSegment) => {
      const { target } = segment;
      activeSegmentRef.current = { id: segment.id, activity: target.activity };

      if (target.activity === "song") {
        void loadSongCatalog().then(({ BUILT_IN_SONGS, getSongById }) => {
          const song = getSongById(BUILT_IN_SONGS, target.songId);
          if (song) onOpenSong(song);
          onNavigate("songs");
        });
        return;
      }

      if (target.activity === "reading") {
        const patch: Partial<PracticeSettings> = { readingRange: target.readingRange };
        if (target.customReadingRange) patch.customReadingRange = target.customReadingRange;
        onConfigureDrill("reading", patch);
      } else {
        const patch: Partial<PracticeSettings> = {
          pitchRange: target.pitchRange,
          pitchExercise: target.pitchExercise,
        };
        if (target.customPitchRange) patch.customPitchRange = target.customPitchRange;
        onConfigureDrill("pitch", patch);
      }
      onNavigate("practice");
    },
    [onConfigureDrill, onOpenSong, onNavigate],
  );

  // Mark the launched segment complete when its activity reports done: a drill
  // sets lastSummary on finishRound; a song reaches "complete". Launching first
  // resets both signals, so this only fires for the freshly-finished activity.
  useEffect(() => {
    const active = activeSegmentRef.current;
    if (!active) return;

    const done = active.activity === "song" ? songStatus === "complete" : lastSummary !== null;
    if (!done) return;

    activeSegmentRef.current = null;
    setMix((current) => {
      if (!current || current.completedSegmentIds.includes(active.id)) return current;
      const next = { ...current, completedSegmentIds: [...current.completedSegmentIds, active.id] };
      saveDailyMix(next);
      return next;
    });
  }, [lastSummary, songStatus]);

  return { mix, startSegment, regenerate: () => void regenerate() };
}

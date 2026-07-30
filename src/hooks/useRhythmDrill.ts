// Everything the rhythm screen needs: its settings and its running session.
//
// Bundled into one hook so the shell wires up a drill in a single line and the
// workspace stays presentational, receiving behaviour through props rather than
// reaching for hooks itself.

import { useCallback, useState } from "react";
import { useRhythmSession } from "./useRhythmSession";
import type { RhythmSessionView, RhythmSettings } from "../types";

export type UseRhythmDrill = {
  settings: RhythmSettings;
  updateSettings: (patch: Partial<RhythmSettings>) => void;
  session: RhythmSessionView;
};

const DEFAULT_SETTINGS: RhythmSettings = {
  bpm: 80,
  meter: { beats: 4, beatUnit: 4 },
  bars: 2,
  vocabulary: "eighths",
};

export function useRhythmDrill(): UseRhythmDrill {
  const [settings, setSettings] = useState<RhythmSettings>(DEFAULT_SETTINGS);
  const updateSettings = useCallback(
    (patch: Partial<RhythmSettings>) => setSettings((current) => ({ ...current, ...patch })),
    [],
  );

  return { settings, updateSettings, session: useRhythmSession(settings) };
}

import { useCallback, useEffect, useMemo } from "react";
import { playSoundWorldPreview } from "../audio";
import { resolveSoundWorld, setActiveSoundWorld } from "../sound/soundWorlds";
import { BUILT_IN_SOUND_WORLDS, soundWorldById, type SoundWorldView } from "../types";

// Keeps the audio layer's active world in step with the stored setting.
//
// The setting holds an id and the audio layer holds the world, so this is the
// one place they are reconciled. Doing it in an effect rather than at selection
// time means a world restored from storage — or arriving from an import — is
// applied too, instead of only one chosen by tapping.
export function useSoundWorld(soundWorldId: string, onSelect: (id: string) => void): SoundWorldView {
  // What will actually be heard. Resolving is pure, so it happens during
  // render rather than in state: reading the audio module back would leave the
  // picker a render behind, and mirroring it in state would mean two places
  // that can disagree.
  const active = useMemo(() => resolveSoundWorld(soundWorldById(soundWorldId, BUILT_IN_SOUND_WORLDS)), [soundWorldId]);

  // The effect does one thing: tell the audio layer what to play. That is a
  // genuine external system, and it is the only reason this hook exists.
  useEffect(() => {
    setActiveSoundWorld(soundWorldId);
  }, [soundWorldId]);

  const preview = useCallback((id: string) => {
    // Previewed without committing: the learner hears the candidate while
    // practice stays on whatever they already chose.
    playSoundWorldPreview(soundWorldById(id, BUILT_IN_SOUND_WORLDS));
  }, []);

  return {
    worlds: BUILT_IN_SOUND_WORLDS,
    activeId: active.world.id,
    notice: active.fellBack ? (active.reason ?? null) : null,
    select: onSelect,
    preview,
  };
}

// The transcription editor.
//
// Writing music down is an editing task, not an answering task: a learner hears
// a phrase, puts down what they think they heard, then fixes it. That means
// undo, delete, and move have to be first-class, and a keyboard has to reach all
// of them — transcription is the one exercise where "just tap the right key" is
// not enough.
//
// Two decisions keep the state honest. History is one piece of state, not three,
// so every edit is applied from the state React actually has rather than from
// whatever a callback closed over — otherwise two notes entered in the same tick
// would clobber each other. And the selection is held as an onset, not an index:
// an index into a sorted list stops meaning the same note the moment anything
// moves.

import { useCallback, useMemo, useState } from "react";
import type { NotatedNote } from "../types";

export type UseTranscriber = {
  notes: NotatedNote[];
  // Index of the note being edited, or null when nothing is selected.
  selected: number | null;
  canUndo: boolean;
  canRedo: boolean;
  select: (index: number | null) => void;
  // Places a note at the given slot, replacing whatever was there.
  place: (onsetTicks: number, midi: number) => void;
  removeAt: (index: number) => void;
  // Moves the selected note by whole semitones, for keyboard editing.
  nudgePitch: (semitones: number) => void;
  // Moves the selected note along the grid, in slots.
  nudgeOnset: (slots: number) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
};

export type TranscriberOptions = {
  // The onset positions a note may occupy, in ticks. Entry is on a grid because
  // the answer is notation: a note is on a beat or it is not.
  slots: readonly number[];
  lowMidi: number;
  highMidi: number;
};

const HISTORY_LIMIT = 50;

type History = { past: NotatedNote[][]; present: NotatedNote[]; future: NotatedNote[][] };

const EMPTY: History = { past: [], present: [], future: [] };

function sortNotes(notes: readonly NotatedNote[]): NotatedNote[] {
  return [...notes].sort((a, b) => a.onsetTicks - b.onsetTicks);
}

export function useTranscriber({ slots, lowMidi, highMidi }: TranscriberOptions): UseTranscriber {
  const [history, setHistory] = useState<History>(EMPTY);
  const [selectedOnset, setSelectedOnset] = useState<number | null>(null);

  const slotList = useMemo(() => [...slots].sort((a, b) => a - b), [slots]);
  const notes = history.present;

  // Every edit goes through here, so undo can never miss one, and every edit
  // sees the notes as they actually are rather than as they were at render.
  const apply = useCallback((update: (current: NotatedNote[]) => NotatedNote[]) => {
    setHistory((current) => {
      const next = sortNotes(update(current.present));
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        // A new edit makes the redo branch unreachable, which is what a learner
        // expects: the thing they just did is now the present.
        future: [],
      };
    });
  }, []);

  const place = useCallback(
    (onsetTicks: number, midi: number) => {
      if (!slotList.includes(onsetTicks)) return;
      if (midi < lowMidi || midi > highMidi) return;
      apply((current) => [...current.filter((note) => note.onsetTicks !== onsetTicks), { midi, onsetTicks }]);
      // Deliberately does not select what was just written. Selection steers the
      // next note, so auto-selecting would make a learner playing the phrase
      // straight through overwrite the same position every time.
    },
    [apply, highMidi, lowMidi, slotList],
  );

  const removeAt = useCallback(
    (index: number) => {
      const target = notes[index];
      if (!target) return;
      apply((current) => current.filter((note) => note.onsetTicks !== target.onsetTicks));
      setSelectedOnset(null);
    },
    [apply, notes],
  );

  const nudgePitch = useCallback(
    (semitones: number) => {
      if (selectedOnset === null) return;
      apply((current) =>
        current.map((note) =>
          note.onsetTicks === selectedOnset
            ? { ...note, midi: Math.min(highMidi, Math.max(lowMidi, note.midi + semitones)) }
            : note,
        ),
      );
    },
    [apply, highMidi, lowMidi, selectedOnset],
  );

  const nudgeOnset = useCallback(
    (slotsToMove: number) => {
      if (selectedOnset === null) return;
      const target = slotList[slotList.indexOf(selectedOnset) + slotsToMove];
      // Refuse to move onto an occupied slot rather than silently overwriting a
      // note the learner already placed.
      if (target === undefined || notes.some((note) => note.onsetTicks === target)) return;

      apply((current) =>
        current.map((note) => (note.onsetTicks === selectedOnset ? { ...note, onsetTicks: target } : note)),
      );
      setSelectedOnset(target);
    },
    [apply, notes, selectedOnset, slotList],
  );

  const clear = useCallback(() => {
    setHistory((current) =>
      current.present.length === 0
        ? current
        : { past: [...current.past, current.present].slice(-HISTORY_LIMIT), present: [], future: [] },
    );
    setSelectedOnset(null);
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past[current.past.length - 1];
      if (previous === undefined) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
      };
    });
    setSelectedOnset(null);
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (next === undefined) return current;
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: rest,
      };
    });
    setSelectedOnset(null);
  }, []);

  const select = useCallback(
    (index: number | null) => setSelectedOnset(index === null ? null : (notes[index]?.onsetTicks ?? null)),
    [notes],
  );

  const selected = selectedOnset === null ? null : notes.findIndex((note) => note.onsetTicks === selectedOnset);

  return {
    notes,
    selected: selected === -1 ? null : selected,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    select,
    place,
    removeAt,
    nudgePitch,
    nudgeOnset,
    clear,
    undo,
    redo,
  };
}

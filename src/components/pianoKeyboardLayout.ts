import { PIANO_KEYS, PIANO_WHITE_KEY_COUNT, getPianoKeyById } from "../noteData";
import type { PianoKey } from "../noteData";

export const FULL_WHITE_KEYS = PIANO_KEYS.filter((key) => !key.isBlack);
export const FULL_BLACK_KEYS = PIANO_KEYS.filter((key) => key.isBlack);
export const MOBILE_WHITE_KEY_COUNT = 14;
export const MOBILE_WINDOW_STEP_WHITE_KEYS = 7;
export const MOBILE_DEFAULT_CENTER_NOTE_ID = "C4";
export const MOBILE_QUERY = "(max-width: 640px)";

export function getBlackKeyLeft(key: PianoKey, whiteKeyStart: number, whiteKeyCount: number): string {
  const afterWhiteIndex = key.blackKeyAfterWhiteIndex ?? 0;
  const leftPercent = ((afterWhiteIndex - whiteKeyStart + 0.68) / whiteKeyCount) * 100;

  return `${leftPercent}%`;
}

export function getWindowKeys(centerNoteId: string) {
  const whiteKeyStart = getMobileWhiteKeyStart(centerNoteId);
  const whiteKeyEnd = whiteKeyStart + MOBILE_WHITE_KEY_COUNT - 1;
  const whiteKeys = FULL_WHITE_KEYS.filter(
    (key) => key.whiteKeyIndex !== undefined && key.whiteKeyIndex >= whiteKeyStart && key.whiteKeyIndex <= whiteKeyEnd,
  );
  const blackKeys = FULL_BLACK_KEYS.filter(
    (key) =>
      key.blackKeyAfterWhiteIndex !== undefined &&
      key.blackKeyAfterWhiteIndex >= whiteKeyStart &&
      key.blackKeyAfterWhiteIndex < whiteKeyEnd,
  );

  return { blackKeys, whiteKeys, whiteKeyStart };
}

export function getMovedWindowCenterNoteId(centerNoteId: string, whiteKeyOffset: number): string {
  const nextWhiteKeyIndex = getTargetWhiteKeyIndex(centerNoteId) + whiteKeyOffset;

  return getWhiteKeyIdByIndex(nextWhiteKeyIndex);
}

export function getOverviewCenterNoteId(clientX: number, railLeft: number, railWidth: number): string {
  const ratio = railWidth > 0 ? (clientX - railLeft) / railWidth : 0;
  const keyIndex = Math.floor(clamp(ratio, 0, 0.999) * PIANO_KEYS.length);

  return PIANO_KEYS[keyIndex]?.id ?? MOBILE_DEFAULT_CENTER_NOTE_ID;
}

function getMobileWhiteKeyStart(centerNoteId: string): number {
  const centeredStart = getTargetWhiteKeyIndex(centerNoteId) - Math.floor(MOBILE_WHITE_KEY_COUNT / 2);
  const lastStart = PIANO_WHITE_KEY_COUNT - MOBILE_WHITE_KEY_COUNT;

  return clamp(centeredStart, 0, lastStart);
}

function getTargetWhiteKeyIndex(noteId: string): number {
  const targetKey = getPianoKeyById(noteId);

  if (targetKey?.whiteKeyIndex !== undefined) return targetKey.whiteKeyIndex;
  if (targetKey?.blackKeyAfterWhiteIndex !== undefined) return targetKey.blackKeyAfterWhiteIndex + 1;

  return getPianoKeyById("C4")?.whiteKeyIndex ?? 0;
}

function getWhiteKeyIdByIndex(whiteKeyIndex: number): string {
  const clampedIndex = clamp(whiteKeyIndex, 0, PIANO_WHITE_KEY_COUNT - 1);

  return FULL_WHITE_KEYS.find((key) => key.whiteKeyIndex === clampedIndex)?.id ?? MOBILE_DEFAULT_CENTER_NOTE_ID;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

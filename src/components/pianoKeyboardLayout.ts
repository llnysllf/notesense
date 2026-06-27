import { PIANO_KEYS, PIANO_WHITE_KEY_COUNT, getPianoKeyById } from "../noteData";
import type { PianoKey } from "../noteData";

export const FULL_WHITE_KEYS = PIANO_KEYS.filter((key) => !key.isBlack);
export const FULL_BLACK_KEYS = PIANO_KEYS.filter((key) => key.isBlack);
export const MOBILE_WHITE_KEY_COUNT = 14;
export const MOBILE_QUERY = "(max-width: 640px)";

export function getBlackKeyLeft(key: PianoKey, whiteKeyStart: number, whiteKeyCount: number): string {
  const afterWhiteIndex = key.blackKeyAfterWhiteIndex ?? 0;
  const leftPercent = ((afterWhiteIndex - whiteKeyStart + 0.68) / whiteKeyCount) * 100;

  return `${leftPercent}%`;
}

export function getWindowKeys(targetNoteId: string) {
  const whiteKeyStart = getMobileWhiteKeyStart(targetNoteId);
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

function getMobileWhiteKeyStart(targetNoteId: string): number {
  const centeredStart = getTargetWhiteKeyIndex(targetNoteId) - Math.floor(MOBILE_WHITE_KEY_COUNT / 2);
  const lastStart = PIANO_WHITE_KEY_COUNT - MOBILE_WHITE_KEY_COUNT;

  return Math.min(Math.max(centeredStart, 0), lastStart);
}

function getTargetWhiteKeyIndex(targetNoteId: string): number {
  const targetKey = getPianoKeyById(targetNoteId);

  if (targetKey?.whiteKeyIndex !== undefined) return targetKey.whiteKeyIndex;
  if (targetKey?.blackKeyAfterWhiteIndex !== undefined) return targetKey.blackKeyAfterWhiteIndex + 1;

  return getPianoKeyById("C4")?.whiteKeyIndex ?? 0;
}

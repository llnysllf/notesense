// Rational musical time, in quarter-note units. Authored durations and
// offsets are exact fractions of a quarter note (quarter = 1/1, eighth = 1/2,
// sixteenth = 1/4, triplet-eighth = 1/3, dotted-quarter = 3/2). Rational time
// is the persisted source of truth. Integer ticks are a *compiler* resolution
// derived from it via a versioned Transport — never a stored limitation, so a
// future transport version can change PPQ without touching authored scores.

export type Rational = { num: number; den: number };

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

// Builds a normalized, reduced Rational with a positive denominator. Returns
// undefined for non-integer, non-finite, or zero-denominator input.
export function rational(num: number, den = 1): Rational | undefined {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return undefined;
  const sign = den < 0 ? -1 : 1;
  const n = num * sign;
  const d = den * sign;
  const g = gcd(n, d);
  return { num: n / g, den: d / g };
}

export const ZERO: Rational = { num: 0, den: 1 };

export function isRational(value: unknown): value is Rational {
  if (typeof value !== "object" || value === null) return false;
  const r = value as { num?: unknown; den?: unknown };
  return (
    typeof r.num === "number" &&
    Number.isInteger(r.num) &&
    typeof r.den === "number" &&
    Number.isInteger(r.den) &&
    r.den > 0
  );
}

export function addRational(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den + b.num * a.den, a.den * b.den) as Rational;
}

export function subRational(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den - b.num * a.den, a.den * b.den) as Rational;
}

export function mulRational(a: Rational, b: Rational): Rational {
  return rational(a.num * b.num, a.den * b.den) as Rational;
}

// Negative when a < b, zero when equal, positive when a > b.
export function compareRational(a: Rational, b: Rational): number {
  return a.num * b.den - b.num * a.den;
}

export function equalsRational(a: Rational, b: Rational): boolean {
  return compareRational(a, b) === 0;
}

// Float value in quarter notes — for display and seconds math only, never for
// comparison or persistence (use compareRational / the Rational itself).
export function rationalToQuarters(r: Rational): number {
  return r.num / r.den;
}

// Common note values expressed in quarter-note units.
export const DURATION: Record<"whole" | "half" | "quarter" | "eighth" | "sixteenth", Rational> = {
  whole: { num: 4, den: 1 },
  half: { num: 2, den: 1 },
  quarter: { num: 1, den: 1 },
  eighth: { num: 1, den: 2 },
  sixteenth: { num: 1, den: 4 },
};

// A dotted value is 3/2 of its base (one dot).
export function dotted(base: Rational): Rational {
  return mulRational(base, { num: 3, den: 2 });
}

// Scales a base value by a tuplet ratio, e.g. an eighth-note triplet member is
// tuplet(DURATION.eighth, { num: 2, den: 3 }) = 1/3 quarter.
export function tuplet(base: Rational, ratio: Rational): Rational {
  return mulRational(base, ratio);
}

// A versioned playback resolution. PPQ 960 is divisible by 2 and 3, so both
// sixteenths (240 ticks) and triplets (320 ticks) compile to exact integers.
export type Transport = { version: number; ppq: number };

export const TRANSPORT_V1: Transport = { version: 1, ppq: 960 };

// Compiles authored rational quarter-note time to integer ticks at the
// transport's PPQ. Returns undefined when the value is not representable as an
// integer tick count at this resolution (an unsupported tuplet, for example).
export function rationalToTicks(r: Rational, transport: Transport = TRANSPORT_V1): number | undefined {
  const ticks = (r.num * transport.ppq) / r.den;
  return Number.isInteger(ticks) ? ticks : undefined;
}

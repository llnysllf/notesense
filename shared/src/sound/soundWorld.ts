// What a sound world is, and what it has to declare about itself.
//
// A "sound world" is the voice practice is heard through. The default is the
// zero-asset synth the app has always used; the rest are alternatives a learner
// can choose, either synthesized here or loaded from a sample pack.
//
// The manifest is strict on purpose. A sampled pack is somebody's recording,
// and shipping one without a recorded, allowed licence is a legal problem
// wearing a feature's clothes. So every world declares its licence and
// attribution, validation *fails on unknown* rather than defaulting to
// permitted, and a world that cannot prove its provenance never reaches a
// registry.

export type SoundWorldId = string;

// Licences an asset may carry. Deliberately the same set the dependency audit
// allows, plus the public-domain marker used for the built-in synth: one policy
// for what this project is willing to ship, not two that can drift.
export const ALLOWED_ASSET_LICENSES = ["CC0-1.0", "CC-BY-4.0", "Apache-2.0", "MIT", "public-domain"] as const;

export type AssetLicense = (typeof ALLOWED_ASSET_LICENSES)[number];

// How a world makes sound. `synth` needs no assets and no network; `sampled`
// needs a pack, which is why it carries a size and has to be fetched.
export type SoundWorldKind = "synth" | "sampled";

// The shape of a synthesized voice. Parameters rather than code, so a world is
// data that can be validated, compared, and previewed without executing
// anything a manifest supplied.
export type SynthVoice = {
  wave: "sine" | "triangle" | "square" | "sawtooth";
  // Seconds. A short attack reads as percussive, a long one as bowed.
  attackSeconds: number;
  // How quickly the note falls away, as a share of its total length.
  decayShare: number;
  peakGain: number;
  // Relative levels of the harmonics above the fundamental. Empty is a pure
  // tone; a piano-ish voice needs a few.
  partials: number[];
};

export type SoundWorld = {
  id: SoundWorldId;
  label: string;
  description: string;
  kind: SoundWorldKind;
  version: number;
  license: AssetLicense;
  attribution: string;
  // Bytes a learner would download. Zero for a synth world, which is the point
  // of keeping the synth the default.
  approxBytes: number;
  // Present for synth worlds; absent for sampled ones, which get their voice
  // from the pack.
  voice?: SynthVoice;
  // Same-origin path to the pack. Never a full URL: the content policy forbids
  // other origins, and a manifest is not allowed to talk the app out of that.
  assetPath?: string;
  // The range the world was checked across. A pack that only sounds right in
  // the middle two octaves should say so rather than being quietly wrong at
  // the edges.
  lowMidi: number;
  highMidi: number;
};

const LICENSES = new Set<string>(ALLOWED_ASSET_LICENSES);
const WAVES = new Set<string>(["sine", "triangle", "square", "sawtooth"]);

export type ManifestIssue = { id: string; problem: string };

function isFiniteInRange(value: unknown, low: number, high: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
}

// Semantic checks a normalizer cannot make: whether a world is actually usable
// and whether it is allowed to be shipped at all.
export function validateSoundWorld(world: SoundWorld): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  const fail = (problem: string) => issues.push({ id: world.id, problem });

  if (world.id.trim().length === 0) fail("missing id");
  if (world.label.trim().length === 0) fail("missing label");
  // Unknown licence is a failure, never a default. Guessing here is how
  // unlicensed audio ends up shipped.
  if (!LICENSES.has(world.license)) fail(`licence ${world.license} is not on the allowed list`);
  if (world.attribution.trim().length === 0) fail("missing attribution");
  if (world.version < 1) fail("version must be at least 1");
  if (world.lowMidi >= world.highMidi) fail("checked range is empty");

  if (world.kind === "synth") {
    if (!world.voice) fail("a synth world needs a voice");
    if (world.approxBytes !== 0) fail("a synth world downloads nothing and must declare zero bytes");
    if (world.assetPath) fail("a synth world must not point at an asset");
  } else {
    if (!world.assetPath) fail("a sampled world needs an asset path");
    if (world.approxBytes <= 0) fail("a sampled world must declare its size");
    // A manifest asking the app to fetch from elsewhere is refused outright
    // rather than being sanitised into something almost acceptable.
    if (world.assetPath && !world.assetPath.startsWith("/")) fail("asset path must be same-origin and absolute");
    if (world.assetPath?.includes("//")) fail("asset path must not name another origin");
  }

  return issues;
}

// Reads an untrusted manifest entry. Anything unrecognisable is discarded
// rather than repaired: a half-understood sound pack is not worth playing.
export function normalizeSoundWorld(value: unknown): SoundWorld | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;

  const id = typeof candidate.id === "string" ? candidate.id.trim().slice(0, 60) : "";
  const label = typeof candidate.label === "string" ? candidate.label.trim().slice(0, 60) : "";
  const kind = candidate.kind === "sampled" ? "sampled" : "synth";
  const license = typeof candidate.license === "string" ? candidate.license : "";
  if (id.length === 0 || label.length === 0 || !LICENSES.has(license)) return undefined;

  const world: SoundWorld = {
    id,
    label,
    description: typeof candidate.description === "string" ? candidate.description.trim().slice(0, 200) : "",
    kind,
    version: isFiniteInRange(candidate.version, 1, 9999) ? Math.round(candidate.version) : 1,
    license: license as AssetLicense,
    attribution: typeof candidate.attribution === "string" ? candidate.attribution.trim().slice(0, 200) : "",
    approxBytes: isFiniteInRange(candidate.approxBytes, 0, 50_000_000) ? Math.round(candidate.approxBytes) : 0,
    lowMidi: isFiniteInRange(candidate.lowMidi, 21, 108) ? Math.round(candidate.lowMidi) : 21,
    highMidi: isFiniteInRange(candidate.highMidi, 21, 108) ? Math.round(candidate.highMidi) : 108,
  };

  const voice = normalizeVoice(candidate.voice);
  if (voice) world.voice = voice;
  if (typeof candidate.assetPath === "string" && candidate.assetPath.startsWith("/")) {
    world.assetPath = candidate.assetPath.slice(0, 200);
  }

  return validateSoundWorld(world).length === 0 ? world : undefined;
}

function normalizeVoice(value: unknown): SynthVoice | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.wave !== "string" || !WAVES.has(candidate.wave)) return undefined;

  return {
    wave: candidate.wave as SynthVoice["wave"],
    attackSeconds: isFiniteInRange(candidate.attackSeconds, 0, 1) ? candidate.attackSeconds : 0.02,
    decayShare: isFiniteInRange(candidate.decayShare, 0.05, 1) ? candidate.decayShare : 0.9,
    peakGain: isFiniteInRange(candidate.peakGain, 0.01, 1) ? candidate.peakGain : 0.22,
    partials: Array.isArray(candidate.partials)
      ? candidate.partials.filter((level): level is number => isFiniteInRange(level, 0, 1)).slice(0, 6)
      : [],
  };
}

// A world's licence line, for the screen that offers it. Attribution shown
// where the choice is made rather than buried in a settings page nobody opens.
export function describeSoundWorld(world: SoundWorld): string {
  const size = world.approxBytes === 0 ? "no download" : `${Math.round(world.approxBytes / 1024)} KB`;
  return `${world.attribution} · ${world.license} · ${size}`;
}

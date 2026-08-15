// The public pages and the site's own URLs, as plain data.
//
// This module deliberately imports nothing. The build reads it directly to
// prerender one HTML file per page and to write the sitemap, and a module with
// no imports is one the build's config loader can read without pulling the
// whole contract graph in behind it. The types live next door in page.ts, which
// is where a wrong capability id fails to compile.

// Where the site is served from, and where its source is. Held here so the
// sitemap, the prerendered <head> tags, and the footer cannot disagree.
export const SITE_URL = "https://llnysllf.github.io/notesense/";
export const SOURCE_URL = "https://github.com/llnysllf/notesense";
// One real, static preview image for shared links. Keeping it local means a
// shared link never makes a visitor or a crawler talk to a third party.
export const SOCIAL_CARD_URL = "https://llnysllf.github.io/notesense/social-card.png";

export const MARKETING_PAGE_DATA = [
  {
    id: "home",
    path: "/",
    navLabel: "Home",
    title: "NoteSense | Piano Note Reading Trainer",
    description:
      "Practice sight reading, rhythm, ear training, and singing in your browser. Free, offline, and no account needed.",
    heading: "Practice reading music until it stops being slow.",
    intro:
      "NoteSense drills the parts of playing that only get better by repetition: reading notes, keeping time, and hearing what you play. It runs in your browser, works offline, and keeps everything on your device.",
    capabilities: ["reading", "ear", "rhythm", "singing", "progress", "offline"],
    primaryAction: { label: "Start practising", href: "/practice/reading" },
  },
  {
    id: "how-it-works",
    path: "/how-it-works",
    navLabel: "How it works",
    title: "How NoteSense works",
    description:
      "How NoteSense chooses what you practice: a placement check, adaptive repetition, and a Reading Score you can repeat.",
    heading: "It picks what to practice, so you do not have to.",
    intro:
      "Every answer you give is kept as evidence. That record decides which notes come back, how often, and when a skill is due for review — rather than a fixed lesson order that ignores what you already know.",
    capabilities: ["placement", "reading-score", "progress", "midi", "sound"],
    primaryAction: { label: "Find your starting point", href: "/assess/placement" },
  },
  {
    id: "reading",
    path: "/sight-reading",
    navLabel: "Sight reading",
    title: "Sight reading practice",
    description:
      "Read notes on treble, bass, and grand staff, and answer on a piano keyboard. Four modes, adaptive to your weak notes.",
    heading: "Sight reading, one note at a time.",
    intro:
      "Notes appear on the staff and you name them on a keyboard. The mode decides how much help you get, and Practice mode keeps returning to the notes you get wrong.",
    capabilities: ["reading", "songs", "import", "progress"],
    primaryAction: { label: "Practise sight reading", href: "/practice/reading" },
  },
  {
    id: "rhythm",
    path: "/rhythm",
    navLabel: "Rhythm",
    title: "Rhythm practice",
    description: "Tap generated rhythm patterns against a metronome and see exactly where you were early or late.",
    heading: "Rhythm you can see, not just feel.",
    intro:
      "A pattern is generated, a metronome counts you in, and you tap. Every tap is graded against where the beat actually was, so 'rushing' becomes a number rather than a feeling.",
    capabilities: ["rhythm", "midi", "progress"],
    primaryAction: { label: "Try a rhythm drill", href: "/practice/rhythm" },
  },
  {
    id: "ear",
    path: "/ear-training",
    navLabel: "Ear training",
    title: "Ear training practice",
    description:
      "Name intervals, chords, scales, and cadences by ear, or write down what you heard on a staff you can undo.",
    heading: "Hear it, then write it down.",
    intro:
      "Naming an interval is one skill; writing down a phrase you have only heard is a harder one. Both are here, and the second is what makes the first useful.",
    capabilities: ["ear", "pitch", "sound"],
    primaryAction: { label: "Try ear training", href: "/practice/ear" },
  },
  {
    id: "singing",
    path: "/singing",
    navLabel: "Singing",
    title: "Singing practice",
    description:
      "Sing a phrase and see your pitch, steadiness, and timing. Analysed in your browser; no audio is recorded or sent.",
    heading: "Singing is the fastest way to find out what you actually hear.",
    intro:
      "You sing a short phrase and get back pitch centre, steadiness, and timing. The analysis happens in your browser, frame by frame, and the audio is gone the moment it has been measured.",
    capabilities: ["singing", "pitch", "offline"],
    primaryAction: { label: "Try singing practice", href: "/practice/singing" },
  },
  {
    id: "privacy",
    path: "/privacy",
    navLabel: "Privacy",
    title: "Privacy at NoteSense",
    description:
      "NoteSense has no accounts, no analytics, and no servers. Your practice and any file you open stay on your device.",
    heading: "There is no server to send anything to.",
    intro:
      "NoteSense is a static site. It has no backend, no accounts, no analytics, and no third-party trackers. Your progress lives in your browser's storage, and you can export or delete it whenever you like.",
    capabilities: ["offline", "import", "singing"],
    primaryAction: { label: "Read your saved data", href: "/settings/data" },
  },
  {
    id: "help",
    path: "/help",
    navLabel: "Help",
    title: "Help and support",
    description: "How to get started with NoteSense, what you need, and where to report a problem.",
    heading: "Getting started, and getting unstuck.",
    intro:
      "NoteSense needs a modern browser and nothing else. A digital piano over USB is optional; a mouse, a touchscreen, or your computer keyboard all work.",
    capabilities: ["midi", "offline", "progress"],
    primaryAction: { label: "Start practising", href: "/practice/reading" },
  },
  {
    id: "terms",
    path: "/terms",
    navLabel: "Terms",
    title: "Terms for using NoteSense",
    description:
      "The simple terms for using NoteSense: a free local practice tool with no account, uploads, paid service, or support contract.",
    heading: "A simple tool, with simple terms.",
    intro:
      "NoteSense is a free, local practice tool. It has no accounts, paid service, uploads, or support contract. You are responsible for your device, browser storage, and any files you choose to open; see Privacy for how the app handles them.",
    capabilities: ["offline", "import", "singing"],
    primaryAction: { label: "Start practising", href: "/practice/reading" },
  },
] as const;

// Trailing slashes, removed without a regular expression.
//
// The obvious `/\/+$/` is quadratic on a string of many slashes that does not
// end in one, because the engine retries the match at every position. This runs
// once per build over a constant, so the cost is theoretical — but a URL is the
// kind of value that later arrives from somewhere else, and a scan flagged it
// rather than waiting to find out.
export function withoutTrailingSlash(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end -= 1;
  return value.slice(0, end);
}

// The public URLs, in the order a sitemap should list them. Only marketing
// pages: the app's own destinations are behind a client-side router and are of
// no use to a crawler.
export function sitemapUrls(baseUrl: string, paths: readonly string[] = MARKETING_PAGE_DATA.map((p) => p.path)) {
  const trimmed = withoutTrailingSlash(baseUrl);
  return paths.map((path) => (path === "/" ? `${trimmed}/` : `${trimmed}${path}`));
}

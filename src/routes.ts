// The app's destination map: one place that defines every URL-addressable
// screen, its label, and which group it belongs to. Kept pure and free of React
// so navigation structure can be tested directly and so the nav, the router, and
// the topbar all read the same source instead of drifting apart.
//
// Destinations are only listed here when the screen actually exists. Navigation
// that leads to an empty promise is worse than no navigation, so Today, Learn,
// and Account arrive with the slices that build them.

import type { PracticeMode } from "./types";

// Which workspace a destination shows. Owned here rather than by the nav
// component so hooks and the router can use it without depending on
// presentation.
export type AppSection =
  | "today"
  | "practice"
  | "rhythm"
  | "ear"
  | "singing"
  | "songs"
  | "import"
  | "placement"
  | "reading-score"
  | "progress"
  | "map"
  | "history"
  | "settings"
  | "data";

export type RouteId =
  | "today"
  | "practice-reading"
  | "practice-pitch"
  | "rhythm"
  | "ear"
  | "singing"
  | "songs"
  | "import"
  | "assess-placement"
  | "assess-reading-score"
  | "progress"
  | "progress-map"
  | "progress-history"
  | "settings"
  | "settings-data";

export type RouteGroup = "Today" | "Practice" | "Assess" | "Progress" | "Settings";

export type RouteDefinition = {
  id: RouteId;
  path: string;
  label: string;
  group: RouteGroup;
  // How the destination maps onto the existing workspace state. Routing changed
  // how a screen is addressed, not what it renders.
  section: AppSection;
  mode?: PracticeMode;
};

export const ROUTES: readonly RouteDefinition[] = [
  { id: "today", path: "/today", label: "Today", group: "Today", section: "today" },
  {
    id: "practice-reading",
    path: "/practice/reading",
    label: "Note reading",
    group: "Practice",
    section: "practice",
    mode: "reading",
  },
  {
    id: "practice-pitch",
    path: "/practice/pitch",
    label: "Pitch training",
    group: "Practice",
    section: "practice",
    mode: "pitch",
  },
  { id: "rhythm", path: "/practice/rhythm", label: "Rhythm", group: "Practice", section: "rhythm" },
  { id: "ear", path: "/practice/ear", label: "Ear training", group: "Practice", section: "ear" },
  { id: "singing", path: "/practice/singing", label: "Singing", group: "Practice", section: "singing" },
  { id: "songs", path: "/practice/songs", label: "Songs", group: "Practice", section: "songs" },
  { id: "import", path: "/practice/import", label: "Import", group: "Practice", section: "import" },
  { id: "assess-placement", path: "/assess/placement", label: "Placement", group: "Assess", section: "placement" },
  {
    id: "assess-reading-score",
    path: "/assess/reading-score",
    label: "Reading Score",
    group: "Assess",
    section: "reading-score",
  },
  { id: "progress", path: "/progress", label: "Overview", group: "Progress", section: "progress" },
  { id: "progress-map", path: "/progress/map", label: "Map", group: "Progress", section: "map" },
  { id: "progress-history", path: "/progress/history", label: "History", group: "Progress", section: "history" },
  { id: "settings", path: "/settings", label: "Preferences", group: "Settings", section: "settings" },
  { id: "settings-data", path: "/settings/data", label: "Data", group: "Settings", section: "data" },
];

export const ROUTE_GROUPS: readonly RouteGroup[] = ["Today", "Practice", "Assess", "Progress", "Settings"];

// Where the app lands when no destination is given.
export const DEFAULT_ROUTE = ROUTES[0] as RouteDefinition;

const BY_ID = new Map<RouteId, RouteDefinition>(ROUTES.map((route) => [route.id, route]));
const BY_PATH = new Map<string, RouteDefinition>(ROUTES.map((route) => [route.path, route]));

// Trailing slashes and empty segments should not produce a different screen.
export function normalizeRoutePath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  const trimmed = withLeadingSlash.replace(/\/+$/, "");
  return trimmed.length === 0 ? "/" : trimmed;
}

// Resolves a URL path to a destination, or undefined when nothing matches so the
// caller can decide between a redirect and a not-found screen.
export function matchRoute(path: string): RouteDefinition | undefined {
  return BY_PATH.get(normalizeRoutePath(path));
}

export function getRoute(id: RouteId): RouteDefinition {
  return BY_ID.get(id) as RouteDefinition;
}

// The destination a legacy section (plus practice mode) corresponds to, so
// existing in-app navigation keeps working while call sites migrate to paths.
export function routeForSection(section: AppSection, mode: PracticeMode = "reading"): RouteDefinition {
  if (section === "practice") {
    return getRoute(mode === "pitch" ? "practice-pitch" : "practice-reading");
  }
  return ROUTES.find((route) => route.section === section) ?? DEFAULT_ROUTE;
}

export function groupedRoutes(): Array<{ group: RouteGroup; routes: RouteDefinition[] }> {
  return ROUTE_GROUPS.map((group) => ({ group, routes: ROUTES.filter((route) => route.group === group) }));
}

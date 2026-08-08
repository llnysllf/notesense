// Which stats view a destination shows.
//
// Destinations that render their own workspace do not have a stats view at all;
// they are listed here so that adding one cannot silently fall through to a
// panel that makes no sense for it.

import type { PracticePanelView } from "./components/PracticeStatsPanel";
import type { AppSection } from "./routes";

export type WorkspaceSection =
  "today" | "practice" | "rhythm" | "ear" | "singing" | "songs" | "placement" | "reading-score";

const STATS_SECTION_BY_APP_SECTION: Record<Exclude<AppSection, WorkspaceSection>, PracticePanelView> = {
  progress: "overview",
  map: "map",
  history: "history",
  settings: "settings",
  data: "data",
};

const WORKSPACE_SECTIONS = new Set<string>([
  "today",
  "practice",
  "rhythm",
  "ear",
  "singing",
  "songs",
  "placement",
  "reading-score",
]);

export function getStatsView(section: AppSection): PracticePanelView {
  if (WORKSPACE_SECTIONS.has(section)) return "overview";

  return STATS_SECTION_BY_APP_SECTION[section as Exclude<AppSection, WorkspaceSection>];
}

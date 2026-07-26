// Bridges the browser URL and the app's destination model.
//
// Every screen is addressable, so a learner can bookmark a drill, use browser
// back/forward, and reload without losing their place. The hook owns the URL as
// the single source of truth for "where am I", replacing the previous
// section-in-useState approach.

import { useCallback } from "react";
import { navigate, usePath } from "raviger";
import {
  DEFAULT_ROUTE,
  matchRoute,
  normalizeRoutePath,
  routeForSection,
  type AppSection,
  type RouteDefinition,
} from "../routes";
import type { PracticeMode } from "../types";

export type AppRoute = {
  route: RouteDefinition;
  // True when the URL did not match any destination, so the caller can tell a
  // typo apart from a deliberate visit to the default screen.
  isUnknownPath: boolean;
  goToRoute: (route: RouteDefinition) => void;
  goToSection: (section: AppSection, mode?: PracticeMode) => void;
};

export function useAppRoute(): AppRoute {
  const path = usePath() ?? "/";
  const matched = matchRoute(path);
  const isUnknownPath = matched === undefined && normalizeRoutePath(path) !== "/";

  const goToRoute = useCallback((next: RouteDefinition) => {
    navigate(next.path);
  }, []);

  const goToSection = useCallback((section: AppSection, mode: PracticeMode = "reading") => {
    navigate(routeForSection(section, mode).path);
  }, []);

  return {
    route: matched ?? DEFAULT_ROUTE,
    isUnknownPath,
    goToRoute,
    goToSection,
  };
}

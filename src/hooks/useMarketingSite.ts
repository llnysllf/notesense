import { useCallback, useMemo } from "react";
import { navigate } from "raviger";
import { ROUTES } from "../routes";
import { useReadingDemo } from "./useReadingDemo";
import {
  marketingNavPages,
  shippedCapabilities,
  type CapabilityId,
  type MarketingPage,
  type MarketingView,
} from "../types";

// Assembles a public page from the shipped product.
//
// The page says which capabilities it wants to talk about; this decides which
// of those are actually reachable, by checking them against the app's own route
// table. A screen that is removed therefore disappears from the marketing site
// in the same commit, rather than in whichever later one somebody notices.
export function useMarketingSite(page: MarketingPage): MarketingView {
  const demo = useReadingDemo(page.id === "home");

  const claims = useMemo(() => {
    const reachable = new Map(
      shippedCapabilities(ROUTES.map((route) => route.path)).map((capability) => [capability.id, capability]),
    );
    return page.capabilities
      .map((id: CapabilityId) => reachable.get(id))
      .filter((capability) => capability !== undefined);
  }, [page]);

  const onNavigate = useCallback((path: string) => {
    navigate(path);
  }, []);

  return {
    page,
    claims,
    navPages: marketingNavPages(),
    demo,
    onNavigate,
  };
}

import { Suspense, lazy } from "react";
import { usePath } from "raviger";
import MarketingPageView from "./components/marketing/MarketingPageView";
import { useMarketingSite } from "./hooks/useMarketingSite";
import { usePageMetadata } from "./hooks/usePageMetadata";
import { normalizeRoutePath } from "./routes";
import { SITE_URL, marketingPageByPath, type MarketingPage } from "./types";

// Which of the two things this URL is: a public page, or the app.
//
// The split is here rather than inside the app so the practice code is not on
// the path of a first visit. Someone who has never used NoteSense loads the
// marketing page and nothing else; the drills, the evidence ledger, and the
// audio arrive only when they decide to practise.
const PracticeApp = lazy(() => import("./App"));

// The resilience build can be told to fail on purpose, to prove the error
// boundary shows a recovery screen rather than a blank page. It is thrown from
// the outermost component so the check covers the public site as well as the
// app, rather than only whichever one the test happened to open.
const shouldForceRenderError = () =>
  import.meta.env.MODE === "resilience" && window.sessionStorage.getItem("notesense.forceRenderError") === "true";

function MarketingRoute({ page }: { page: MarketingPage }) {
  const site = useMarketingSite(page);
  usePageMetadata(page, SITE_URL);

  return <MarketingPageView site={site} />;
}

function Site() {
  if (shouldForceRenderError()) {
    throw new Error("Forced NoteSense render failure");
  }

  const page = marketingPageByPath(normalizeRoutePath(usePath() ?? "/"));

  if (page) return <MarketingRoute page={page} />;

  return (
    <Suspense fallback={<div className="app-loading" role="status" aria-live="polite" />}>
      <PracticeApp />
    </Suspense>
  );
}

export default Site;

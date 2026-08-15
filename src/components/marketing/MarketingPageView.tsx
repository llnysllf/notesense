import MarketingShell from "./MarketingShell";
import ReadingDemo from "./ReadingDemo";
import type { MarketingView } from "../../types";

type MarketingPageViewProps = {
  site: MarketingView;
};

// One layout for every public page: what this is, what it does, and the one
// thing to do next.
//
// The capability list is the page's content, and it comes from the shipped
// product rather than from copy written here. That is what keeps the site
// honest when a screen changes: there is no second place to update.
function MarketingPageView({ site }: MarketingPageViewProps) {
  const { page, claims, demo, navPages, onNavigate } = site;

  return (
    <MarketingShell page={page} navPages={navPages} onNavigate={onNavigate}>
      <section className="site-hero">
        <h1>{page.heading}</h1>
        <p className="site-intro">{page.intro}</p>
        {/* A page with a demo puts its one action underneath the demo instead:
            asking someone to commit before they have tried it, and then again
            after, is the same ask printed twice. */}
        {!demo && (
          <button type="button" className="primary-button" onClick={() => onNavigate(page.primaryAction.href)}>
            {page.primaryAction.label}
          </button>
        )}
      </section>

      {demo && <ReadingDemo demo={demo} onStart={() => onNavigate(page.primaryAction.href)} />}

      <section className="site-claims" aria-labelledby="claims-heading">
        <h2 id="claims-heading">What you can do</h2>
        <ul>
          {claims.map((capability) => (
            <li key={capability.id} className="site-claim">
              <h3>{capability.label}</h3>
              <p className="site-claim-line">{capability.claim}</p>
              <p className="site-claim-detail">{capability.detail}</p>
              {capability.routePath && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onNavigate(capability.routePath as string)}
                >
                  Open {capability.label.toLowerCase()}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </MarketingShell>
  );
}

export default MarketingPageView;

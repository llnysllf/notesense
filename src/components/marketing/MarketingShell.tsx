import type { ReactNode } from "react";
import { SOURCE_URL, type MarketingPage } from "../../types";

type MarketingShellProps = {
  page: MarketingPage;
  navPages: readonly MarketingPage[];
  onNavigate: (path: string) => void;
  children: ReactNode;
};

// The frame around every public page: who this is, where else to go, and the
// one action worth taking.
//
// Navigation is a list of links rather than a menu that opens, because eight
// destinations fit on a phone and a menu that hides them buys nothing.
function MarketingShell({ page, navPages, onNavigate, children }: MarketingShellProps) {
  return (
    <div className="site">
      <header className="site-header">
        <a
          className="site-wordmark"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/");
          }}
        >
          NoteSense
        </a>

        <nav className="site-nav" aria-label="Site">
          <ul>
            {navPages.map((entry) => (
              <li key={entry.id}>
                <a
                  href={entry.path}
                  aria-current={entry.path === page.path ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(entry.path);
                  }}
                >
                  {entry.navLabel}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          className="site-action"
          href="/practice/reading"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/practice/reading");
          }}
        >
          Start practising
        </a>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <p>NoteSense runs in your browser. No account, no servers, no tracking.</p>
        <ul>
          <li>
            <a
              href="/privacy"
              onClick={(event) => {
                event.preventDefault();
                onNavigate("/privacy");
              }}
            >
              Privacy
            </a>
          </li>
          <li>
            <a
              href="/help"
              onClick={(event) => {
                event.preventDefault();
                onNavigate("/help");
              }}
            >
              Help
            </a>
          </li>
          <li>
            <a href={SOURCE_URL}>Source</a>
          </li>
        </ul>
      </footer>
    </div>
  );
}

export default MarketingShell;

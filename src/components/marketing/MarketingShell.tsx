import type { ReactNode } from "react";
import { Link } from "raviger";
import { SOURCE_URL, type MarketingPage } from "../../types";

type MarketingShellProps = {
  page: MarketingPage;
  navPages: readonly MarketingPage[];
  children: ReactNode;
};

// The frame around every public page: who this is, where else to go, and the
// one action worth taking.
//
// Navigation is a list of links rather than a menu that opens, because eight
// destinations fit on a phone and a menu that hides them buys nothing.
//
// Every internal link is a router Link, not a bare anchor. The deployed site is
// served from a sub-path, and only Link knows about it: an anchor written with
// the app's own path sends a visitor to a URL that does not exist there, and an
// imperative navigate() drops the prefix in exactly the same way.
function MarketingShell({ page, navPages, children }: MarketingShellProps) {
  return (
    <div className="site">
      <header className="site-header">
        <Link className="site-wordmark" href="/">
          NoteSense
        </Link>

        <nav className="site-nav" aria-label="Site">
          <ul>
            {navPages.map((entry) => (
              <li key={entry.id}>
                <Link href={entry.path} aria-current={entry.path === page.path ? "page" : undefined}>
                  {entry.navLabel}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link className="site-action" href="/practice/reading">
          Start practising
        </Link>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <p>NoteSense runs in your browser. No account, no servers, no tracking.</p>
        <ul>
          <li>
            <Link href="/privacy">Privacy</Link>
          </li>
          <li>
            <Link href="/help">Help</Link>
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

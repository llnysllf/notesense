// Compact single-row app header: menu toggle (drawer viewports only),
// brand lockup, and the session status + replay action pair.
type AppTopbarProps = {
  subtitle: string;
  sessionStateLabel: string;
  sessionStateTone: string;
  replayButtonLabel: string;
  isNavOpen: boolean;
  onOpenNav: () => void;
  onReplay: () => void;
};

function AppTopbar({
  subtitle,
  sessionStateLabel,
  sessionStateTone,
  replayButtonLabel,
  isNavOpen,
  onOpenNav,
  onReplay,
}: AppTopbarProps) {
  return (
    <section className="app-header-panel" aria-labelledby="app-title">
      <header className="topbar">
        <button
          className="nav-toggle"
          type="button"
          aria-label="Open menu"
          aria-expanded={isNavOpen}
          aria-controls="app-sidebar"
          onClick={onOpenNav}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="brand-lockup">
          <p className="eyebrow">Adaptive sight reading + ear training</p>
          <h1 id="app-title">NoteSense</h1>
          <p className="app-subtitle">{subtitle}</p>
        </div>
        <div className="topbar-actions">
          <span className={`session-pill ${sessionStateTone}`} aria-live="polite">
            <span aria-hidden="true" />
            {sessionStateLabel}
          </span>
          <button className="secondary-button" type="button" onClick={onReplay}>
            {replayButtonLabel}
          </button>
        </div>
      </header>
    </section>
  );
}

export default AppTopbar;

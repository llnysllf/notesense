import { Suspense, type ReactNode } from "react";
import AppSectionNav from "./AppSectionNav";
import AppTopbar from "./AppTopbar";
import ErrorBoundary from "./ErrorBoundary";
import type { RouteId } from "../routes";

// The chrome around whatever workspace is on screen: navigation, the topbar,
// the error boundary, and the loading fallback for lazily loaded destinations.
//
// Extracted from the shell so that App stays what it is meant to be — wiring
// and routing — and so this arrangement is exercised once rather than being
// repeated per destination.

type AppShellProps = {
  activeRouteId: RouteId;
  activeSection: string;
  layoutClass: string;
  subtitle: string;
  sessionStateLabel: string;
  sessionStateTone: string;
  replayButtonLabel: string;
  isNavOpen: boolean;
  // Changing this discards a broken subtree, so a failure on one destination
  // does not follow the learner to the next one.
  errorResetKey: string;
  children: ReactNode;
  onOpenNav: () => void;
  onCloseNav: () => void;
  onNavigate: () => void;
  onReplay: () => void;
};

function AppShell({
  activeRouteId,
  activeSection,
  layoutClass,
  subtitle,
  sessionStateLabel,
  sessionStateTone,
  replayButtonLabel,
  isNavOpen,
  errorResetKey,
  children,
  onOpenNav,
  onCloseNav,
  onNavigate,
  onReplay,
}: AppShellProps) {
  return (
    <main className={`app-shell app-section-${activeSection} ${layoutClass}`}>
      <AppSectionNav activeRouteId={activeRouteId} isOpen={isNavOpen} onClose={onCloseNav} onNavigate={onNavigate} />

      <div className="app-main">
        <AppTopbar
          subtitle={subtitle}
          sessionStateLabel={sessionStateLabel}
          sessionStateTone={sessionStateTone}
          replayButtonLabel={replayButtonLabel}
          isNavOpen={isNavOpen}
          onOpenNav={onOpenNav}
          onReplay={onReplay}
        />

        <ErrorBoundary resetKey={errorResetKey}>
          <Suspense
            fallback={
              <section className="practice-panel" aria-label="Loading section">
                <p role="status">Loading section...</p>
              </section>
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      </div>
    </main>
  );
}

export default AppShell;

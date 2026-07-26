import { useEffect } from "react";
import { Link } from "raviger";
import { groupedRoutes, type RouteDefinition } from "../routes";

export type { AppSection } from "../routes";

// Sidebar navigation: one flat, scannable list of destinations under three
// group headings, replacing the old stacked switcher rows (section pills,
// sub-tabs, and the in-panel practice-mode toggle). Note reading and Pitch
// training are nav items here because choosing an activity and choosing a
// "mode" were the same decision presented twice.
//
// Destinations come from the shared route model and render as real links, so
// they can be bookmarked, opened in a new tab, and are exposed to assistive
// technology as navigation rather than as buttons.

type AppSectionNavProps = {
  activeRouteId: RouteDefinition["id"];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
};

function AppSectionNav({ activeRouteId, isOpen, onClose, onNavigate }: AppSectionNavProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && <button type="button" className="nav-backdrop" aria-label="Close menu" onClick={onClose} />}
      <nav id="app-sidebar" className={`sidebar ${isOpen ? "open" : ""}`} aria-label="NoteSense sections">
        {groupedRoutes().map(({ group, routes }) => (
          <div className="sidebar-group" key={group}>
            <p className="sidebar-heading">{group}</p>
            {routes.map((route) => {
              const isActive = route.id === activeRouteId;
              return (
                <Link
                  key={route.id}
                  href={route.path}
                  className={isActive ? "active" : ""}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onNavigate}
                >
                  {route.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}

export default AppSectionNav;

import { useEffect } from "react";
import type { PracticeMode } from "../types";

export type AppSection = "today" | "practice" | "songs" | "progress" | "map" | "history" | "settings" | "data";

// Sidebar navigation: one flat, scannable list of destinations under three
// group headings, replacing the old stacked switcher rows (section pills,
// sub-tabs, and the in-panel practice-mode toggle). Note reading and Pitch
// training are nav items here because choosing an activity and choosing a
// "mode" were the same decision presented twice.
const PRACTICE_MODES: Array<{ id: PracticeMode; label: string }> = [
  { id: "reading", label: "Note reading" },
  { id: "pitch", label: "Pitch training" },
];

const SECTION_GROUPS: Array<{ label: string; sections: Array<{ id: AppSection; label: string }> }> = [
  { label: "Home", sections: [{ id: "today", label: "Today" }] },
  { label: "Practice", sections: [{ id: "songs", label: "Songs" }] },
  {
    label: "Progress",
    sections: [
      { id: "progress", label: "Overview" },
      { id: "map", label: "Map" },
      { id: "history", label: "History" },
    ],
  },
  {
    label: "Settings",
    sections: [
      { id: "settings", label: "Preferences" },
      { id: "data", label: "Data" },
    ],
  },
];

type AppSectionNavProps = {
  activeSection: AppSection;
  mode: PracticeMode;
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (section: AppSection) => void;
  onSelectPracticeMode: (mode: PracticeMode) => void;
};

function AppSectionNav({
  activeSection,
  mode,
  isOpen,
  onClose,
  onSelectSection,
  onSelectPracticeMode,
}: AppSectionNavProps) {
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
        {SECTION_GROUPS.map((group) => (
          <div className="sidebar-group" key={group.label}>
            <p className="sidebar-heading">{group.label}</p>
            {group.label === "Practice" &&
              PRACTICE_MODES.map((practiceMode) => (
                <button
                  key={practiceMode.id}
                  type="button"
                  aria-pressed={activeSection === "practice" && mode === practiceMode.id}
                  className={activeSection === "practice" && mode === practiceMode.id ? "active" : ""}
                  onClick={() => onSelectPracticeMode(practiceMode.id)}
                >
                  {practiceMode.label}
                </button>
              ))}
            {group.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                aria-pressed={activeSection === section.id}
                className={activeSection === section.id ? "active" : ""}
                onClick={() => onSelectSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

export default AppSectionNav;

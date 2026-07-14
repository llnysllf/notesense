export type AppSection = "practice" | "songs" | "progress" | "map" | "history" | "settings" | "data";

type SectionGroup = {
  id: "practice" | "progress" | "settings";
  label: string;
  sections: Array<{ id: AppSection; label: string }>;
};

// Two-level navigation: three top-level groups, each with a short row of
// subsections. Songs lives inside Practice because it is a note-reading
// activity, not a separate destination; the stats views cluster under
// Progress and the configuration views under Settings. This keeps the nav
// two compact rows tall instead of seven pills wrapping down the screen.
const SECTION_GROUPS: SectionGroup[] = [
  {
    id: "practice",
    label: "Practice",
    sections: [
      { id: "practice", label: "Drills" },
      { id: "songs", label: "Songs" },
    ],
  },
  {
    id: "progress",
    label: "Progress",
    sections: [
      { id: "progress", label: "Overview" },
      { id: "map", label: "Map" },
      { id: "history", label: "History" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    sections: [
      { id: "settings", label: "Preferences" },
      { id: "data", label: "Data" },
    ],
  },
];

function getGroupForSection(section: AppSection): SectionGroup {
  return SECTION_GROUPS.find((group) => group.sections.some(({ id }) => id === section)) ?? SECTION_GROUPS[0]!;
}

type AppSectionNavProps = {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
};

function AppSectionNav({ activeSection, onSectionChange }: AppSectionNavProps) {
  const activeGroup = getGroupForSection(activeSection);

  return (
    <nav className="sections-nav" aria-label="NoteSense sections">
      <div className="sections">
        {SECTION_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            aria-pressed={group.id === activeGroup.id}
            className={group.id === activeGroup.id ? "active" : ""}
            onClick={() => onSectionChange(group.sections[0]!.id)}
          >
            {group.label}
          </button>
        ))}
      </div>
      <div className="section-subnav" aria-label={`${activeGroup.label} views`}>
        {activeGroup.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={activeSection === section.id}
            className={activeSection === section.id ? "active" : ""}
            onClick={() => onSectionChange(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default AppSectionNav;

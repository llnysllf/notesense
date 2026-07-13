export type AppSection = "practice" | "songs" | "progress" | "map" | "history" | "settings" | "data";

const APP_SECTIONS: Array<{ id: AppSection; label: string }> = [
  { id: "practice", label: "Practice" },
  { id: "songs", label: "Songs" },
  { id: "progress", label: "Progress" },
  { id: "map", label: "Map" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
  { id: "data", label: "Data" },
];

type AppSectionNavProps = {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
};

function AppSectionNav({ activeSection, onSectionChange }: AppSectionNavProps) {
  return (
    <nav className="sections" aria-label="NoteSense sections">
      {APP_SECTIONS.map((section) => (
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
    </nav>
  );
}

export default AppSectionNav;

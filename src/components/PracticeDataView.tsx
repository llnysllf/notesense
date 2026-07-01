import { useRef, type ChangeEvent } from "react";
type PracticeDataViewProps = {
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetProgress: () => void;
};

function PracticeDataView({ onExportData, onImportData, onResetProgress }: PracticeDataViewProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleImportInputChange(event: ChangeEvent<HTMLInputElement>) {
    const importFile = event.currentTarget.files?.[0];

    if (importFile) {
      onImportData(importFile);
    }

    event.currentTarget.value = "";
  }

  return (
    <div className="data-card">
      <h3>Data</h3>
      <div className="data-actions">
        <button className="secondary-button" type="button" onClick={onExportData}>
          Export data
        </button>
        <button className="secondary-button" type="button" onClick={() => importInputRef.current?.click()}>
          Import data
        </button>
        <input
          ref={importInputRef}
          aria-label="Import data file"
          className="file-input"
          type="file"
          tabIndex={-1}
          accept="application/json,.json"
          onChange={handleImportInputChange}
        />
        <button className="ghost-button" type="button" onClick={onResetProgress}>
          Reset progress
        </button>
      </div>
    </div>
  );
}

export default PracticeDataView;

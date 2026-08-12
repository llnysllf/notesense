import { useRef } from "react";
import ImportPreview from "./import/ImportPreview";
import type { HandSelection, MidiImportView, QuantizeGrid } from "../types";

// Bringing your own music in.
//
// The screen is built around one idea: a MIDI file records a performance and a
// practice song records something readable, so importing loses things. Every
// control that changes what is lost sits next to a preview of the result, and
// the cost is stated in words before anything is saved.

type ImportWorkspaceProps = { importer: MidiImportView };

const GRIDS: readonly { id: QuantizeGrid; label: string }[] = [
  { id: "quarter", label: "Quarter notes" },
  { id: "eighth", label: "Eighth notes" },
  { id: "sixteenth", label: "Sixteenth notes" },
  { id: "none", label: "Leave as played" },
];

const HANDS: readonly { id: HandSelection; label: string }[] = [
  { id: "both", label: "Both hands" },
  { id: "right", label: "Right hand" },
  { id: "left", label: "Left hand" },
];

function channelsForFile(file: MidiImportView["file"]): number[] {
  return [...new Set(file?.tracks.flatMap((track) => track.channels) ?? [])].sort((a, b) => a - b);
}

function ImportWorkspace({ importer }: ImportWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const channels = channelsForFile(importer.file);

  return (
    <section className="practice-panel import-workspace" aria-label="Import music">
      <div className="import-card">
        <h3>Import a MIDI file</h3>

        <p className="import-note" role="note">
          The file is read in this tab and saved only on this device. Nothing is uploaded. Import only music you have
          the right to use.
        </p>

        <div className="import-actions">
          <button type="button" className="primary-button" onClick={() => inputRef.current?.click()}>
            Choose a MIDI file
          </button>
          {importer.file ? (
            <button type="button" className="secondary-button" onClick={importer.clearFile}>
              Clear
            </button>
          ) : null}
          <input
            ref={inputRef}
            aria-label="MIDI file"
            className="file-input"
            type="file"
            tabIndex={-1}
            accept=".mid,.midi,audio/midi"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importer.openFile(file);
              event.target.value = "";
            }}
          />
        </div>

        {importer.error ? (
          <p className="import-error" role="alert">
            {importer.error}
          </p>
        ) : null}

        {importer.fileName && !importer.error ? <p className="import-file">{importer.fileName}</p> : null}
      </div>

      {importer.file && importer.preview ? (
        <>
          <div className="import-card">
            <h4>What to practise</h4>

            {importer.file.tracks.length > 1 ? (
              <label className="import-picker">
                <span>Track</span>
                <select
                  value={importer.trackIndex ?? ""}
                  onChange={(event) =>
                    importer.setTrackIndex(event.target.value === "" ? undefined : Number(event.target.value))
                  }
                >
                  <option value="">All tracks</option>
                  {importer.file.tracks.map((track) => (
                    <option key={track.index} value={track.index}>
                      {track.name || `Track ${track.index + 1}`} — {track.noteCount} notes
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {channels.length > 1 ? (
              <label className="import-picker">
                <span>Channel</span>
                <select
                  value={importer.channel ?? ""}
                  onChange={(event) =>
                    importer.setChannel(event.target.value === "" ? undefined : Number(event.target.value))
                  }
                >
                  <option value="">All channels</option>
                  {channels.map((channel) => (
                    <option key={channel} value={channel}>
                      Channel {channel + 1}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="import-chips" role="group" aria-label="Hands">
              {HANDS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="chip-button"
                  aria-pressed={importer.hand === option.id}
                  onClick={() => importer.setHand(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="import-chips" role="group" aria-label="Line up notes with">
              {GRIDS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="chip-button"
                  aria-pressed={importer.grid === option.id}
                  onClick={() => importer.setGrid(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="import-picker">
              <span>Transpose (semitones)</span>
              <input
                type="number"
                min="-24"
                max="24"
                step="1"
                value={importer.transpose}
                onChange={(event) => importer.setTranspose(Number(event.target.value))}
              />
            </label>
          </div>

          <ImportPreview
            preview={importer.preview}
            summary={importer.summary}
            savedMessage={importer.savedMessage}
            onSave={importer.save}
          />
        </>
      ) : null}

      {importer.saved.length > 0 ? (
        <div className="import-card">
          <h4>Your imported pieces</h4>
          <ul className="import-saved">
            {importer.saved.map((song) => (
              <li key={song.id}>
                <span>
                  {song.title} — {song.events.length} events
                </span>
                <button
                  type="button"
                  className="ghost-button"
                  aria-label={`Remove ${song.title}`}
                  onClick={() => importer.remove(song.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="import-note">These appear in Songs, and practise exactly like the built-in pieces.</p>
        </div>
      ) : null}
    </section>
  );
}

export default ImportWorkspace;

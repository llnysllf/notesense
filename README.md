# NoteSense

NoteSense is a small piano note-reading trainer for beginner musicians. It focuses on one practical habit: seeing a note on the treble staff and answering quickly until the note names become automatic.

## Features

- Timed 60-second note-reading drill
- Treble clef starter range from middle C to G
- Interactive SVG staff with ledger-line support
- Keyboard or button answers for C, D, E, F, and G
- Instant correct/incorrect feedback
- Web Audio note playback for ear association
- Local progress tracking with overall accuracy, best round, and weak-note stats

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- Browser Web Audio API
- LocalStorage for progress persistence

## Why I Built It

I am learning piano and wanted a simple tool to improve note-reading speed. The project is intentionally small, but it is built like a real product: reusable note data, persistent practice stats, responsive UI, and a clear roadmap for pitch training and MIDI input.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## V1 Scope

The first version is deliberately focused:

- One practice mode
- One clef
- Five starter notes
- No backend
- No login
- No sharps or flats

This keeps the practice loop fast and finishable while leaving room for meaningful future features.

## Roadmap

- Add bass clef practice
- Expand note range
- Add sharps and flats
- Add pitch-recognition mode
- Add interval training
- Add MIDI keyboard input
- Add charts for weekly practice history

## Portfolio Summary

Built a piano note-reading trainer using React and TypeScript, with timed drills, interactive notation, Web Audio playback, and locally persisted progress analytics.

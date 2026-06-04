# NoteSense

NoteSense is a small piano sight-reading and ear-training app for beginner musicians. It focuses on two practical habits: reading notes on the treble staff and recognizing natural piano pitches by ear.

## Features

- Timed 60-second note-reading drill
- Treble clef starter range from middle C to G
- Interactive SVG staff with ledger-line support
- Keyboard or button answers for C, D, E, F, and G
- Pitch-training mode across one natural-note octave, C4 to B4
- Hidden pitch reveal after each answer
- Instant correct/incorrect feedback
- Web Audio note playback for ear association
- Separate local progress tracking for note reading and pitch training
- Focus-note and focus-pitch stats for weak areas

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- Browser Web Audio API
- LocalStorage for progress persistence

## Why I Built It

I am learning piano and wanted a simple tool to improve note-reading speed and pitch recognition. The project is intentionally small, but it is built like a real product: reusable note data, persistent practice stats, responsive UI, and a clear roadmap for stronger ear-training and MIDI input.

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

## V2 Scope

The current version is deliberately focused:

- Two practice modes
- One sight-reading clef
- Five starter reading notes
- Seven natural pitch-training notes
- No backend
- No login
- No sharps or flats

This keeps the practice loop fast and finishable while leaving room for meaningful future features.

## Roadmap

- Add bass clef practice
- Expand note range
- Add sharps and flats
- Add interval training
- Add MIDI keyboard input
- Add charts for weekly practice history

## Portfolio Summary

Built a piano sight-reading and ear-training app using React and TypeScript, with timed drills, interactive notation, pitch recognition, Web Audio playback, and locally persisted progress analytics.

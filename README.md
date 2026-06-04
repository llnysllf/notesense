# NoteSense

[![CI](https://github.com/llnysllf/notesense/actions/workflows/ci.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/llnysllf/notesense/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/llnysllf/notesense/actions/workflows/deploy-pages.yml)

NoteSense is a small piano sight-reading and ear-training app for beginner musicians. It focuses on two practical habits: reading notes on the treble staff and recognizing natural piano pitches by ear, then adapts practice toward weak notes and pitches.

Live demo: [https://llnysllf.github.io/notesense/](https://llnysllf.github.io/notesense/)

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
- Adaptive practice that weights weak notes and pitches more often
- Configurable 30, 60, or 90 second rounds
- Round summary with score, accuracy, best streak, and next-practice suggestion

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- CSS
- Browser Web Audio API
- LocalStorage for progress persistence

## Why I Built It

I am learning piano and wanted a simple tool to improve note-reading speed and pitch recognition. The project is intentionally small, but it is built like a real product: reusable note data, adaptive practice logic, persistent practice stats, responsive UI, and a clear roadmap for stronger ear-training and MIDI input.

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

Create the GitHub Pages build:

```bash
npm run build:pages
```

Run the test suite:

```bash
npm test
```

Run the full local quality check:

```bash
npm run check
```

## Engineering Notes

- Practice selection and summary logic live in `src/practiceEngine.ts` so the learning behavior can be tested outside React.
- UI-only pieces live in `src/components` to keep the main app focused on state and orchestration.
- Progress and settings are normalized when loaded from LocalStorage, including migration from the original V1 progress shape.
- Keyboard answers, ARIA pressed states, live feedback, visible focus rings, and reduced-motion support are included for accessibility.
- The test suite covers adaptive weighting, deterministic note selection, focus-note ranking, session summaries, and progress reducers.
- GitHub Actions run typechecking, tests, and builds on every push and pull request.
- The `main` branch publishes a static production build to GitHub Pages.

## V3 Scope

The current version is deliberately focused:

- Two practice modes
- One sight-reading clef
- Five starter reading notes
- Seven natural pitch-training notes
- Adaptive or random practice selection
- Configurable round length
- Session summaries
- Tested practice engine
- CI quality gate
- GitHub Pages deployment
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

Built a piano sight-reading and ear-training app using React and TypeScript, with adaptive timed drills, interactive notation, pitch recognition, Web Audio playback, session summaries, and locally persisted progress analytics.

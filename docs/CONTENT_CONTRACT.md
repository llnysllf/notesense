# Content Contract

Exercise content is framework-free and lives in `@notesense/shared`. Each `ExerciseDefinition` has a stable id,
schema/version fields, generator/curriculum/skill-mapping versions, competency tags, dimensions, difficulty,
stimulus, expected answer, permitted input modes, scoring policy, and provenance.

Generated content must be deterministic for its generator version and seed. `npm run content:check` validates the
schema and semantic rules, then runs the representative 10,000-seed corpus for the built-in reading and pitch
generators. The development-only content preview is available at `?content-preview` in Vite development mode and is
excluded from the production application surface.

This does not add persisted exercise content, a storage key, or an export field. Future persistence or imports must
normalize untrusted definitions and update [DATA_CONTRACT.md](DATA_CONTRACT.md), privacy, and migration contracts.

import type { ExerciseDefinition } from "../types";

type ContentPreviewProps = { exercises: readonly ExerciseDefinition[] };

// Mounted only from the DEV-gated entry point, so it cannot add a production route.
export function ContentPreview({ exercises }: ContentPreviewProps) {
  return (
    <aside aria-label="Content preview">
      <h1>Content preview</h1>
      <p>{exercises.length} generated exercises</p>
      <ul>
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <strong>{exercise.kind}</strong>: {exercise.title} (difficulty {exercise.difficulty.toFixed(2)})
          </li>
        ))}
      </ul>
    </aside>
  );
}

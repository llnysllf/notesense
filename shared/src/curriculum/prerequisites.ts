// The prerequisite graph between competencies. Edges point from a competency to
// the competencies it depends on. The graph must stay acyclic; competencyOrder
// asserts this and returns a topological order used by placement and selection.

import { type CompetencyId } from "./competencies";

export const PREREQUISITES: Readonly<Record<CompetencyId, readonly CompetencyId[]>> = {
  "reading.pitch.staff-to-key": [],
  "reading.pitch.key-to-staff": ["reading.pitch.staff-to-key"],
  "reading.interval.horizontal": ["reading.pitch.staff-to-key"],
  "reading.look-ahead": ["reading.interval.horizontal"],
  "rhythm.pulse": [],
  "rhythm.duration": ["rhythm.pulse"],
  "rhythm.syncopation": ["rhythm.duration"],
  "ear.pitch.absolute-anchor": [],
  "ear.interval.melodic": ["ear.pitch.absolute-anchor"],
  "ear.sequence.transcription": ["ear.interval.melodic", "reading.pitch.key-to-staff"],
  "voice.pitch-match": ["ear.pitch.absolute-anchor"],
  "voice.sight-sing": ["voice.pitch-match", "reading.pitch.staff-to-key"],
};

export function getPrerequisites(id: CompetencyId): readonly CompetencyId[] {
  return PREREQUISITES[id];
}

// Kahn's algorithm; throws if the graph has a cycle. Accepts an alternate graph
// for testing; defaults to the real prerequisite graph.
export function competencyOrder(graph: Readonly<Record<string, readonly string[]>> = PREREQUISITES): CompetencyId[] {
  const remaining = new Map<string, Set<string>>(Object.keys(graph).map((id) => [id, new Set(graph[id])]));
  const order: CompetencyId[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.entries()].find(([, deps]) => deps.size === 0);
    if (!ready) throw new Error("competency prerequisite graph has a cycle");
    const [id] = ready;
    order.push(id as CompetencyId);
    remaining.delete(id);
    for (const deps of remaining.values()) deps.delete(id);
  }
  return order;
}

// True when every prerequisite of `id` is in the mastered set.
export function isReady(id: CompetencyId, mastered: ReadonlySet<CompetencyId>): boolean {
  return PREREQUISITES[id].every((dep) => mastered.has(dep));
}

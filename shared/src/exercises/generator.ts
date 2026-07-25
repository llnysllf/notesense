// The generator interface and registry. Every generator is deterministic in its
// seed and carries a generatorVersion, so any produced exercise can be
// reproduced and later recompiled after an algorithm change.

import { type ExerciseDefinition } from "./exerciseDefinition";

export type GeneratorOptions = { seed: string; difficulty?: number };

export type ExerciseGenerator = {
  kind: string;
  generatorVersion: number;
  generate(options: GeneratorOptions): ExerciseDefinition;
};

export type GeneratorRegistry = {
  kinds(): string[];
  get(kind: string): ExerciseGenerator | undefined;
  generate(kind: string, options: GeneratorOptions): ExerciseDefinition | undefined;
};

export function createRegistry(generators: readonly ExerciseGenerator[]): GeneratorRegistry {
  const byKind = new Map<string, ExerciseGenerator>();
  for (const generator of generators) {
    if (byKind.has(generator.kind)) throw new Error(`duplicate generator kind: ${generator.kind}`);
    byKind.set(generator.kind, generator);
  }
  return {
    kinds: () => [...byKind.keys()],
    get: (kind) => byKind.get(kind),
    generate: (kind, options) => byKind.get(kind)?.generate(options),
  };
}

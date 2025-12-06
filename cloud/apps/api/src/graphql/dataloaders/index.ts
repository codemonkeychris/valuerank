import DataLoader from 'dataloader';
import type { Definition, Run, Transcript, Scenario } from '@valuerank/db';

// DataLoader types (will be implemented in later phases)
export interface DataLoaders {
  definition: DataLoader<string, Definition | null>;
  run: DataLoader<string, Run | null>;
  transcript: DataLoader<string, Transcript | null>;
  scenario: DataLoader<string, Scenario | null>;
}

// Factory function - creates new DataLoader instances per request
// Placeholder implementation until DataLoaders are created
export function createDataLoaders(): DataLoaders {
  // Placeholder loaders that will be replaced in Phase 3+
  const placeholderBatchFn = async (ids: readonly string[]): Promise<(null)[]> => {
    return ids.map(() => null);
  };

  return {
    definition: new DataLoader<string, Definition | null>(placeholderBatchFn),
    run: new DataLoader<string, Run | null>(placeholderBatchFn),
    transcript: new DataLoader<string, Transcript | null>(placeholderBatchFn),
    scenario: new DataLoader<string, Scenario | null>(placeholderBatchFn),
  };
}

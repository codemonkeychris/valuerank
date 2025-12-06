import DataLoader from 'dataloader';
import type { Definition, Run, Transcript, Scenario, Experiment } from '@valuerank/db';
import { createDefinitionLoader } from './definition.js';
import { createRunLoader } from './run.js';
import { createTranscriptLoader, createTranscriptsByRunLoader } from './transcript.js';
import { createScenarioLoader } from './scenario.js';

// DataLoader types
export interface DataLoaders {
  definition: DataLoader<string, Definition | null>;
  run: DataLoader<string, Run | null>;
  transcript: DataLoader<string, Transcript | null>;
  transcriptsByRun: DataLoader<string, Transcript[]>;
  scenario: DataLoader<string, Scenario | null>;
  experiment: DataLoader<string, Experiment | null>;
}

// Factory function - creates new DataLoader instances per request
// Per-request instantiation prevents cache leakage between users
export function createDataLoaders(): DataLoaders {
  // Placeholder batch function for loaders not yet implemented
  const placeholderBatchFn = async <T>(ids: readonly string[]): Promise<(T | null)[]> => {
    return ids.map(() => null);
  };

  return {
    definition: createDefinitionLoader(),
    run: createRunLoader(),
    transcript: createTranscriptLoader(),
    transcriptsByRun: createTranscriptsByRunLoader(),
    scenario: createScenarioLoader(),
    experiment: new DataLoader<string, Experiment | null>(placeholderBatchFn),
  };
}

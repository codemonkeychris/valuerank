import DataLoader from 'dataloader';
import { db } from '@valuerank/db';
import type { Scenario } from '@valuerank/db';
import { createLogger } from '@valuerank/shared';

const log = createLogger('dataloader:scenario');

/**
 * Creates a DataLoader for batching Scenario lookups by ID.
 */
export function createScenarioLoader(): DataLoader<string, Scenario | null> {
  return new DataLoader<string, Scenario | null>(
    async (ids: readonly string[]) => {
      log.debug({ ids: [...ids] }, 'Batching scenario load');

      const scenarios = await db.scenario.findMany({
        where: { id: { in: [...ids] } },
      });

      const scenarioMap = new Map(scenarios.map((s) => [s.id, s]));
      return ids.map((id) => scenarioMap.get(id) ?? null);
    },
    { cache: true }
  );
}

import { builder } from '../builder.js';
import { db } from '@valuerank/db';
import { RunRef, DefinitionRef, TranscriptRef, ExperimentRef } from './refs.js';

// Re-export for backward compatibility
export { RunRef, TranscriptRef, ExperimentRef };

builder.objectType(RunRef, {
  description: 'A run execution against a definition',
  fields: (t) => ({
    id: t.exposeID('id'),
    definitionId: t.exposeString('definitionId'),
    experimentId: t.exposeString('experimentId', { nullable: true }),
    status: t.exposeString('status', {
      description: 'Current status of the run (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED)',
    }),
    config: t.expose('config', { type: 'JSON' }),
    progress: t.expose('progress', { type: 'JSON', nullable: true }),
    startedAt: t.expose('startedAt', { type: 'DateTime', nullable: true }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    lastAccessedAt: t.expose('lastAccessedAt', { type: 'DateTime', nullable: true }),

    // Relation: definition
    definition: t.field({
      type: DefinitionRef,
      resolve: async (run, _args, ctx) => {
        const definition = await ctx.loaders.definition.load(run.definitionId);
        if (!definition) {
          throw new Error(`Definition not found for run ${run.id}`);
        }
        return definition;
      },
    }),

    // Relation: experiment (optional)
    experiment: t.field({
      type: ExperimentRef,
      nullable: true,
      resolve: async (run, _args, ctx) => {
        if (!run.experimentId) return null;
        return ctx.loaders.experiment.load(run.experimentId);
      },
    }),

    // Relation: transcripts with optional model filter
    transcripts: t.field({
      type: [TranscriptRef],
      args: {
        modelId: t.arg.string({
          required: false,
          description: 'Filter transcripts by model ID',
        }),
      },
      resolve: async (run, args, ctx) => {
        const transcripts = await ctx.loaders.transcriptsByRun.load(run.id);
        if (args.modelId) {
          return transcripts.filter((t) => t.modelId === args.modelId);
        }
        return transcripts;
      },
    }),

    // Computed: transcript count
    transcriptCount: t.field({
      type: 'Int',
      resolve: async (run, _args, ctx) => {
        const transcripts = await ctx.loaders.transcriptsByRun.load(run.id);
        return transcripts.length;
      },
    }),

    // Relation: selected scenarios for this run
    selectedScenarios: t.field({
      type: ['String'],
      description: 'IDs of scenarios selected for this run',
      resolve: async (run) => {
        const selections = await db.runScenarioSelection.findMany({
          where: { runId: run.id },
          select: { scenarioId: true },
        });
        return selections.map((s) => s.scenarioId);
      },
    }),
  }),
});

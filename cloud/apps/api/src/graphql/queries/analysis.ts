import { builder } from '../builder.js';
import { db } from '@valuerank/db';
import { AnalysisResultRef } from '../types/analysis.js';

// Query: analysis(runId: ID!) - Fetch analysis result for a run
builder.queryField('analysis', (t) =>
  t.field({
    type: AnalysisResultRef,
    nullable: true,
    description: 'Fetch the current analysis result for a run. Returns null if not yet computed.',
    args: {
      runId: t.arg.id({ required: true, description: 'Run ID' }),
    },
    resolve: async (_root, args, ctx) => {
      const runId = String(args.runId);
      ctx.log.debug({ runId }, 'Fetching analysis');

      const analysis = await db.analysisResult.findFirst({
        where: {
          runId,
          status: 'CURRENT',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!analysis) {
        ctx.log.debug({ runId }, 'Analysis not found');
        return null;
      }

      return analysis;
    },
  })
);

// Query: analysisHistory(runId: ID!, limit: Int) - Fetch all analysis versions for a run
builder.queryField('analysisHistory', (t) =>
  t.field({
    type: [AnalysisResultRef],
    description: 'Fetch all analysis versions for a run, including superseded versions.',
    args: {
      runId: t.arg.id({ required: true, description: 'Run ID' }),
      limit: t.arg.int({
        required: false,
        defaultValue: 10,
        description: 'Maximum number of results (default: 10)',
      }),
      offset: t.arg.int({
        required: false,
        description: 'Number of results to skip (default: 0)',
      }),
    },
    resolve: async (_root, args, ctx) => {
      const runId = String(args.runId);
      const limit = args.limit ?? 10;
      const offset = args.offset ?? 0;

      ctx.log.debug({ runId, limit, offset }, 'Fetching analysis history');

      const analyses = await db.analysisResult.findMany({
        where: { runId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return analyses;
    },
  })
);

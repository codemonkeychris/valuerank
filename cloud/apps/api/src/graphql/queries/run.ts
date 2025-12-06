import { builder } from '../builder.js';
import { db } from '@valuerank/db';
import { RunRef } from '../types/run.js';

// Query: run(id: ID!) - Fetch single run by ID
builder.queryField('run', (t) =>
  t.field({
    type: RunRef,
    nullable: true,
    description: 'Fetch a single run by ID. Returns null if not found.',
    args: {
      id: t.arg.id({ required: true, description: 'Run ID' }),
    },
    resolve: async (_root, args, ctx) => {
      const id = String(args.id);
      ctx.log.debug({ runId: id }, 'Fetching run');

      const run = await db.run.findUnique({
        where: { id },
      });

      if (!run) {
        ctx.log.debug({ runId: id }, 'Run not found');
        return null;
      }

      return run;
    },
  })
);

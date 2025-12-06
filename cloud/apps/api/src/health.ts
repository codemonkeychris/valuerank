import { Router } from 'express';
import type { RequestHandler } from 'express';
import { db } from '@valuerank/db';
import { createLogger } from '@valuerank/shared';

const log = createLogger('health');

export const healthRouter = Router();

healthRouter.get('/', ((_req, res) => {
  void (async () => {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
      },
    });
  } catch (err) {
    log.error({ err }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
      },
    });
  }
  })();
}) as RequestHandler);

import crypto from 'crypto';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './health.js';
import { yoga } from './graphql/index.js';
import { createLogger, AppError } from '@valuerank/shared';

// Extend Express Request to include logger
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      log: ReturnType<typeof createLogger>;
      requestId: string;
    }
  }
}

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Request ID and logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
    req.requestId = requestId;
    req.log = createLogger('request').child({ requestId, method: req.method, path: req.path });

    const start = Date.now();
    req.log.info('Request started');

    res.on('finish', () => {
      req.log.info({ status: res.statusCode, duration: Date.now() - start }, 'Request completed');
    });

    next();
  });

  // Routes
  app.use('/health', healthRouter);

  // GraphQL endpoint
  app.all('/graphql', (req, res) => {
    void yoga.handle(req, res);
  });

  // Root
  app.get('/', (_req, res) => {
    res.json({ name: 'Cloud ValueRank API', version: '0.1.0' });
  });

  // Global error handler (per CLAUDE.md)
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    req.log.error({ err }, 'Request failed');

    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.code, message: err.message });
    } else {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
    }
  });

  return app;
}

/**
 * Analyze Handler Tests
 *
 * Tests the analyze:basic and analyze:deep stub handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as PgBoss from 'pg-boss';
import { createAnalyzeBasicHandler } from '../../../src/queue/handlers/analyze-basic.js';
import { createAnalyzeDeepHandler } from '../../../src/queue/handlers/analyze-deep.js';
import type { AnalyzeBasicJobData, AnalyzeDeepJobData } from '../../../src/queue/types.js';

// Speed up tests by reducing stub delay
vi.stubEnv('STUB_JOB_DELAY_MS', '10');

describe('Analyze Basic Handler', () => {
  let handler: PgBoss.WorkHandler<AnalyzeBasicJobData>;

  beforeEach(() => {
    handler = createAnalyzeBasicHandler();
  });

  it('creates a handler function', () => {
    expect(typeof handler).toBe('function');
  });

  it('processes a single job', async () => {
    const jobs: PgBoss.Job<AnalyzeBasicJobData>[] = [
      {
        id: 'job-1',
        name: 'analyze:basic',
        data: {
          runId: 'run-123',
          transcriptIds: ['t1', 't2', 't3'],
        },
        createdOn: new Date(),
        startedOn: new Date(),
      } as PgBoss.Job<AnalyzeBasicJobData>,
    ];

    // Should not throw
    await handler(jobs);
  });

  it('processes multiple jobs in batch', async () => {
    const jobs: PgBoss.Job<AnalyzeBasicJobData>[] = [
      {
        id: 'job-1',
        name: 'analyze:basic',
        data: {
          runId: 'run-1',
          transcriptIds: ['t1'],
        },
        createdOn: new Date(),
        startedOn: new Date(),
      } as PgBoss.Job<AnalyzeBasicJobData>,
      {
        id: 'job-2',
        name: 'analyze:basic',
        data: {
          runId: 'run-2',
          transcriptIds: ['t2', 't3'],
        },
        createdOn: new Date(),
        startedOn: new Date(),
      } as PgBoss.Job<AnalyzeBasicJobData>,
      {
        id: 'job-3',
        name: 'analyze:basic',
        data: {
          runId: 'run-3',
          transcriptIds: [],
        },
        createdOn: new Date(),
        startedOn: new Date(),
      } as PgBoss.Job<AnalyzeBasicJobData>,
    ];

    // Should process all jobs without throwing
    await handler(jobs);
  });

  it('handles empty job batch', async () => {
    const jobs: PgBoss.Job<AnalyzeBasicJobData>[] = [];

    // Should not throw
    await handler(jobs);
  });
});

describe('Analyze Deep Handler', () => {
  let handler: PgBoss.WorkHandler<AnalyzeDeepJobData>;

  beforeEach(() => {
    handler = createAnalyzeDeepHandler();
  });

  it('creates a handler function', () => {
    expect(typeof handler).toBe('function');
  });

  it('processes a pairwise analysis job', async () => {
    const jobs: PgBoss.Job<AnalyzeDeepJobData>[] = [
      {
        id: 'job-1',
        name: 'analyze:deep',
        data: {
          runId: 'run-123',
          analysisType: 'pairwise',
        },
        createdOn: new Date(),
        startedOn: new Date(),
      } as PgBoss.Job<AnalyzeDeepJobData>,
    ];

    // Should not throw
    await handler(jobs);
  });

  it('processes a cluster analysis job', async () => {
    const jobs: PgBoss.Job<AnalyzeDeepJobData>[] = [
      {
        id: 'job-1',
        name: 'analyze:deep',
        data: {
          runId: 'run-123',
          analysisType: 'cluster',
        },
        createdOn: new Date(),
        startedOn: new Date(),
      } as PgBoss.Job<AnalyzeDeepJobData>,
    ];

    // Should not throw
    await handler(jobs);
  });

  it('processes multiple jobs in batch', async () => {
    const jobs: PgBoss.Job<AnalyzeDeepJobData>[] = [
      {
        id: 'job-1',
        name: 'analyze:deep',
        data: {
          runId: 'run-1',
          analysisType: 'pairwise',
        },
        createdOn: new Date(),
        startedOn: new Date(),
      } as PgBoss.Job<AnalyzeDeepJobData>,
      {
        id: 'job-2',
        name: 'analyze:deep',
        data: {
          runId: 'run-2',
          analysisType: 'cluster',
        },
        createdOn: new Date(),
        startedOn: new Date(),
      } as PgBoss.Job<AnalyzeDeepJobData>,
    ];

    // Should process all jobs without throwing
    await handler(jobs);
  });

  it('handles empty job batch', async () => {
    const jobs: PgBoss.Job<AnalyzeDeepJobData>[] = [];

    // Should not throw
    await handler(jobs);
  });
});

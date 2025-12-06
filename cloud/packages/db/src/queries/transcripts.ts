/**
 * Transcript query helpers.
 * Handles CRUD operations for pipeline transcripts.
 */

import { createLogger, NotFoundError, ValidationError } from '@valuerank/shared';
import { db } from '../client.js';
import { loadTranscriptContent } from '../schema-migration.js';
import type { TranscriptContent } from '../types.js';
import type { Transcript, Prisma } from '@prisma/client';

const log = createLogger('db:transcripts');

// ============================================================================
// INPUT TYPES
// ============================================================================

export type CreateTranscriptInput = {
  runId: string;
  scenarioId?: string;
  targetModel: string;
  content: TranscriptContent;
  turnCount: number;
  tokenCount: number;
  durationMs: number;
};

export type TranscriptFilters = {
  runId?: string;
  scenarioId?: string;
  targetModel?: string;
  limit?: number;
  offset?: number;
};

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export type TranscriptWithContent = Transcript & {
  parsedContent: TranscriptContent;
};

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a new transcript.
 */
export async function createTranscript(data: CreateTranscriptInput): Promise<Transcript> {
  if (!data.runId) {
    throw new ValidationError('Run ID is required', { field: 'runId' });
  }
  if (!data.targetModel) {
    throw new ValidationError('Target model is required', { field: 'targetModel' });
  }
  if (!data.content) {
    throw new ValidationError('Transcript content is required', { field: 'content' });
  }

  log.info(
    { runId: data.runId, targetModel: data.targetModel, turnCount: data.turnCount },
    'Creating transcript'
  );

  return db.transcript.create({
    data: {
      runId: data.runId,
      scenarioId: data.scenarioId,
      targetModel: data.targetModel,
      content: data.content as unknown as Prisma.InputJsonValue,
      turnCount: data.turnCount,
      tokenCount: data.tokenCount,
      durationMs: data.durationMs,
    },
  });
}

/**
 * Create multiple transcripts in a single batch.
 */
export async function createTranscripts(
  transcripts: CreateTranscriptInput[]
): Promise<{ count: number }> {
  if (transcripts.length === 0) {
    return { count: 0 };
  }

  log.info({ count: transcripts.length }, 'Creating transcripts batch');

  const result = await db.transcript.createMany({
    data: transcripts.map((t) => ({
      runId: t.runId,
      scenarioId: t.scenarioId,
      targetModel: t.targetModel,
      content: t.content as unknown as Prisma.InputJsonValue,
      turnCount: t.turnCount,
      tokenCount: t.tokenCount,
      durationMs: t.durationMs,
    })),
  });

  return result;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a transcript by ID.
 */
export async function getTranscriptById(id: string): Promise<Transcript> {
  log.debug({ id }, 'Fetching transcript');

  const transcript = await db.transcript.findUnique({ where: { id } });
  if (!transcript) {
    log.warn({ id }, 'Transcript not found');
    throw new NotFoundError('Transcript', id);
  }

  return transcript;
}

/**
 * Get a transcript with parsed content.
 */
export async function getTranscriptWithContent(id: string): Promise<TranscriptWithContent> {
  const transcript = await getTranscriptById(id);
  const parsedContent = loadTranscriptContent(transcript.content);

  return {
    ...transcript,
    parsedContent,
  };
}

/**
 * Get all transcripts for a run.
 */
export async function getTranscriptsForRun(runId: string): Promise<Transcript[]> {
  log.debug({ runId }, 'Fetching transcripts for run');

  return db.transcript.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get transcripts with parsed content for a run.
 */
export async function getTranscriptsWithContentForRun(
  runId: string
): Promise<TranscriptWithContent[]> {
  const transcripts = await getTranscriptsForRun(runId);

  return transcripts.map((t) => ({
    ...t,
    parsedContent: loadTranscriptContent(t.content),
  }));
}

/**
 * List transcripts with optional filters.
 */
export async function listTranscripts(filters?: TranscriptFilters): Promise<Transcript[]> {
  log.debug({ filters }, 'Listing transcripts');

  const where: Prisma.TranscriptWhereInput = {};

  if (filters?.runId) where.runId = filters.runId;
  if (filters?.scenarioId) where.scenarioId = filters.scenarioId;
  if (filters?.targetModel) where.targetModel = filters.targetModel;

  return db.transcript.findMany({
    where,
    take: filters?.limit,
    skip: filters?.offset,
    orderBy: { createdAt: 'desc' },
  });
}

// ============================================================================
// AGGREGATE OPERATIONS
// ============================================================================

/**
 * Get transcript statistics for a run.
 */
export async function getTranscriptStatsForRun(
  runId: string
): Promise<{
  count: number;
  totalTokens: number;
  totalDurationMs: number;
  avgTurns: number;
  modelCounts: Record<string, number>;
}> {
  log.debug({ runId }, 'Getting transcript stats');

  const transcripts = await db.transcript.findMany({
    where: { runId },
    select: {
      targetModel: true,
      turnCount: true,
      tokenCount: true,
      durationMs: true,
    },
  });

  const modelCounts: Record<string, number> = {};
  let totalTokens = 0;
  let totalDurationMs = 0;
  let totalTurns = 0;

  for (const t of transcripts) {
    modelCounts[t.targetModel] = (modelCounts[t.targetModel] ?? 0) + 1;
    totalTokens += t.tokenCount;
    totalDurationMs += t.durationMs;
    totalTurns += t.turnCount;
  }

  return {
    count: transcripts.length,
    totalTokens,
    totalDurationMs,
    avgTurns: transcripts.length > 0 ? totalTurns / transcripts.length : 0,
    modelCounts,
  };
}

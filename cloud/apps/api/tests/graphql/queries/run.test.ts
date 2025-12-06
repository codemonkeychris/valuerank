import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../../../src/server.js';
import { db } from '@valuerank/db';
import type { Definition, Run, Transcript } from '@valuerank/db';

const app = createServer();

describe('GraphQL Run Query', () => {
  let testDefinition: Definition;
  let testRun: Run;
  let testTranscript: Transcript;

  beforeAll(async () => {
    // Create test definition
    testDefinition = await db.definition.create({
      data: {
        name: 'Run Test Definition',
        content: { schema_version: 1, preamble: 'Test' },
      },
    });

    // Create test run
    testRun = await db.run.create({
      data: {
        definitionId: testDefinition.id,
        status: 'COMPLETED',
        config: { models: ['gpt-4', 'claude-3'], samplePercentage: 50 },
        progress: { completed: 10, total: 10 },
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:30:00Z'),
      },
    });

    // Create test transcript
    testTranscript = await db.transcript.create({
      data: {
        runId: testRun.id,
        modelId: 'gpt-4',
        modelVersion: '0125-preview',
        content: { messages: [{ role: 'user', content: 'Hello' }] },
        turnCount: 2,
        tokenCount: 150,
        durationMs: 2500,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in correct order
    await db.transcript.deleteMany({ where: { runId: testRun.id } });
    await db.run.deleteMany({ where: { id: testRun.id } });
    await db.definition.deleteMany({ where: { id: testDefinition.id } });
  });

  describe('run(id)', () => {
    it('returns run with all scalar fields', async () => {
      const query = `
        query GetRun($id: ID!) {
          run(id: $id) {
            id
            definitionId
            status
            config
            progress
            startedAt
            completedAt
            createdAt
            updatedAt
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query, variables: { id: testRun.id } });

      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.run).toMatchObject({
        id: testRun.id,
        definitionId: testDefinition.id,
        status: 'COMPLETED',
      });
      expect(response.body.data.run.config).toHaveProperty('models');
      expect(response.body.data.run.progress).toHaveProperty('completed', 10);
    });

    it('returns null for non-existent ID', async () => {
      const query = `
        query GetRun($id: ID!) {
          run(id: $id) {
            id
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query, variables: { id: 'nonexistent-id' } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.run).toBeNull();
    });

    it('resolves definition relationship via DataLoader', async () => {
      const query = `
        query GetRunWithDefinition($id: ID!) {
          run(id: $id) {
            id
            definition {
              id
              name
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query, variables: { id: testRun.id } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.run.definition).toMatchObject({
        id: testDefinition.id,
        name: 'Run Test Definition',
      });
    });

    it('resolves transcripts relationship', async () => {
      const query = `
        query GetRunWithTranscripts($id: ID!) {
          run(id: $id) {
            id
            transcripts {
              id
              modelId
              turnCount
              tokenCount
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query, variables: { id: testRun.id } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.run.transcripts).toHaveLength(1);
      expect(response.body.data.run.transcripts[0]).toMatchObject({
        id: testTranscript.id,
        modelId: 'gpt-4',
        turnCount: 2,
        tokenCount: 150,
      });
    });

    it('filters transcripts by modelId', async () => {
      // Add another transcript with different model
      const otherTranscript = await db.transcript.create({
        data: {
          runId: testRun.id,
          modelId: 'claude-3',
          content: { messages: [] },
          turnCount: 1,
          tokenCount: 50,
          durationMs: 1000,
        },
      });

      const query = `
        query GetRunWithFilteredTranscripts($id: ID!, $modelId: String) {
          run(id: $id) {
            id
            transcripts(modelId: $modelId) {
              id
              modelId
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query, variables: { id: testRun.id, modelId: 'gpt-4' } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.run.transcripts).toHaveLength(1);
      expect(response.body.data.run.transcripts[0].modelId).toBe('gpt-4');

      // Clean up
      await db.transcript.delete({ where: { id: otherTranscript.id } });
    });

    it('returns transcriptCount', async () => {
      const query = `
        query GetRunWithCount($id: ID!) {
          run(id: $id) {
            id
            transcriptCount
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query, variables: { id: testRun.id } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.run.transcriptCount).toBe(1);
    });

    it('resolves nested definition and back to runs', async () => {
      const query = `
        query GetNestedRelations($id: ID!) {
          run(id: $id) {
            id
            definition {
              id
              runs {
                id
                status
              }
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query, variables: { id: testRun.id } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.run.definition.runs).toContainEqual({
        id: testRun.id,
        status: 'COMPLETED',
      });
    });
  });
});

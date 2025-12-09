/**
 * Integration tests for LLM GraphQL queries.
 *
 * Tests the GraphQL API for providers, models, and system settings.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';
import { db } from '@valuerank/db';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../../src/auth/api-keys.js';

const app = createServer();

describe('LLM GraphQL Queries', () => {
  let testUser: { id: string; email: string };
  let apiKey: string;

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: `llm-query-test-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
      },
    });

    // Create API key for authentication
    apiKey = generateApiKey();
    await db.apiKey.create({
      data: {
        userId: testUser.id,
        name: 'Test Key',
        keyHash: hashApiKey(apiKey),
        keyPrefix: getKeyPrefix(apiKey),
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await db.apiKey.deleteMany({ where: { userId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
  });

  beforeEach(async () => {
    // Clean LLM data before each test
    await db.systemSetting.deleteMany();
    await db.llmModel.deleteMany();
    await db.llmProvider.deleteMany();
  });

  describe('llmProviders query', () => {
    it('returns all providers', async () => {
      // Create test providers
      await db.llmProvider.create({
        data: {
          name: 'openai',
          displayName: 'OpenAI',
        },
      });
      await db.llmProvider.create({
        data: {
          name: 'anthropic',
          displayName: 'Anthropic',
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              llmProviders {
                id
                name
                displayName
                isEnabled
                maxParallelRequests
                requestsPerMinute
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.llmProviders).toHaveLength(2);

      const names = response.body.data.llmProviders.map((p: { name: string }) => p.name);
      expect(names).toContain('openai');
      expect(names).toContain('anthropic');
    });

    it('returns empty array when no providers exist', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `query { llmProviders { id name } }`,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmProviders).toHaveLength(0);
    });
  });

  describe('llmProvider query', () => {
    it('returns provider by ID', async () => {
      const provider = await db.llmProvider.create({
        data: {
          name: 'openai',
          displayName: 'OpenAI',
          maxParallelRequests: 5,
          requestsPerMinute: 100,
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query GetProvider($id: String!) {
              llmProvider(id: $id) {
                id
                name
                displayName
                maxParallelRequests
                requestsPerMinute
              }
            }
          `,
          variables: { id: provider.id },
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.llmProvider.name).toBe('openai');
      expect(response.body.data.llmProvider.maxParallelRequests).toBe(5);
    });

    it('returns null for non-existent provider', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              llmProvider(id: "non-existent") {
                id
                name
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmProvider).toBeNull();
    });
  });

  describe('llmModels query', () => {
    it('returns all models with provider', async () => {
      const provider = await db.llmProvider.create({
        data: {
          name: 'openai',
          displayName: 'OpenAI',
        },
      });
      await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          costInputPerMillion: 2.5,
          costOutputPerMillion: 10.0,
        },
      });
      await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4o-mini',
          displayName: 'GPT-4o Mini',
          costInputPerMillion: 0.15,
          costOutputPerMillion: 0.6,
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              llmModels {
                id
                modelId
                displayName
                costInputPerMillion
                costOutputPerMillion
                status
                isDefault
                provider {
                  name
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.llmModels).toHaveLength(2);

      const model = response.body.data.llmModels.find(
        (m: { modelId: string }) => m.modelId === 'gpt-4o'
      );
      expect(model.displayName).toBe('GPT-4o');
      expect(model.costInputPerMillion).toBe(2.5);
      expect(model.provider.name).toBe('openai');
    });

    it('filters by provider ID', async () => {
      const openai = await db.llmProvider.create({
        data: { name: 'openai', displayName: 'OpenAI' },
      });
      const anthropic = await db.llmProvider.create({
        data: { name: 'anthropic', displayName: 'Anthropic' },
      });
      await db.llmModel.create({
        data: {
          providerId: openai.id,
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          costInputPerMillion: 2.5,
          costOutputPerMillion: 10.0,
        },
      });
      await db.llmModel.create({
        data: {
          providerId: anthropic.id,
          modelId: 'claude-3-opus',
          displayName: 'Claude 3 Opus',
          costInputPerMillion: 15.0,
          costOutputPerMillion: 75.0,
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query FilterModels($providerId: String) {
              llmModels(providerId: $providerId) {
                modelId
              }
            }
          `,
          variables: { providerId: openai.id },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmModels).toHaveLength(1);
      expect(response.body.data.llmModels[0].modelId).toBe('gpt-4o');
    });

    it('filters by status', async () => {
      const provider = await db.llmProvider.create({
        data: { name: 'openai', displayName: 'OpenAI' },
      });
      await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          costInputPerMillion: 2.5,
          costOutputPerMillion: 10.0,
          status: 'ACTIVE',
        },
      });
      await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4-turbo',
          displayName: 'GPT-4 Turbo (Deprecated)',
          costInputPerMillion: 10.0,
          costOutputPerMillion: 30.0,
          status: 'DEPRECATED',
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query FilterByStatus($status: String) {
              llmModels(status: $status) {
                modelId
                status
              }
            }
          `,
          variables: { status: 'ACTIVE' },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmModels).toHaveLength(1);
      expect(response.body.data.llmModels[0].modelId).toBe('gpt-4o');
      expect(response.body.data.llmModels[0].status).toBe('ACTIVE');
    });
  });

  describe('llmModel query', () => {
    it('returns model by ID', async () => {
      const provider = await db.llmProvider.create({
        data: { name: 'openai', displayName: 'OpenAI' },
      });
      const model = await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          costInputPerMillion: 2.5,
          costOutputPerMillion: 10.0,
          isDefault: true,
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query GetModel($id: String!) {
              llmModel(id: $id) {
                id
                modelId
                displayName
                isDefault
              }
            }
          `,
          variables: { id: model.id },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmModel.modelId).toBe('gpt-4o');
      expect(response.body.data.llmModel.isDefault).toBe(true);
    });

    it('returns null for non-existent model', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              llmModel(id: "non-existent") {
                id
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmModel).toBeNull();
    });
  });

  describe('llmModelByIdentifier query', () => {
    it('returns model by provider name and model ID', async () => {
      const provider = await db.llmProvider.create({
        data: { name: 'openai', displayName: 'OpenAI' },
      });
      await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          costInputPerMillion: 2.5,
          costOutputPerMillion: 10.0,
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query GetByIdentifier($providerName: String!, $modelId: String!) {
              llmModelByIdentifier(providerName: $providerName, modelId: $modelId) {
                modelId
                displayName
              }
            }
          `,
          variables: { providerName: 'openai', modelId: 'gpt-4o' },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmModelByIdentifier.modelId).toBe('gpt-4o');
    });

    it('returns null for non-existent provider', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              llmModelByIdentifier(providerName: "non-existent", modelId: "gpt-4o") {
                id
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmModelByIdentifier).toBeNull();
    });

    it('returns null for non-existent model', async () => {
      await db.llmProvider.create({
        data: { name: 'openai', displayName: 'OpenAI' },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              llmModelByIdentifier(providerName: "openai", modelId: "non-existent") {
                id
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmModelByIdentifier).toBeNull();
    });
  });

  describe('systemSettings query', () => {
    it('returns all system settings', async () => {
      await db.systemSetting.create({
        data: { key: 'setting1', value: { test: 1 } },
      });
      await db.systemSetting.create({
        data: { key: 'setting2', value: { test: 2 } },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              systemSettings {
                key
                value
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.systemSettings).toHaveLength(2);
    });
  });

  describe('systemSetting query', () => {
    it('returns setting by key', async () => {
      await db.systemSetting.create({
        data: { key: 'my_setting', value: { foo: 'bar' } },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query GetSetting($key: String!) {
              systemSetting(key: $key) {
                key
                value
              }
            }
          `,
          variables: { key: 'my_setting' },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.systemSetting.key).toBe('my_setting');
      expect(response.body.data.systemSetting.value).toEqual({ foo: 'bar' });
    });

    it('returns null for non-existent setting', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              systemSetting(key: "non-existent") {
                key
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.systemSetting).toBeNull();
    });
  });

  describe('infraModel query', () => {
    it('returns configured infrastructure model', async () => {
      const provider = await db.llmProvider.create({
        data: { name: 'openai', displayName: 'OpenAI' },
      });
      await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4o-mini',
          displayName: 'GPT-4o Mini',
          costInputPerMillion: 0.15,
          costOutputPerMillion: 0.6,
        },
      });
      await db.systemSetting.create({
        data: {
          key: 'infra_model_scenario_expansion',
          value: { modelId: 'gpt-4o-mini', providerId: 'openai' },
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query GetInfraModel($purpose: String!) {
              infraModel(purpose: $purpose) {
                modelId
                displayName
              }
            }
          `,
          variables: { purpose: 'scenario_expansion' },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.infraModel.modelId).toBe('gpt-4o-mini');
    });

    it('returns null when not configured', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query {
              infraModel(purpose: "scenario_expansion") {
                modelId
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.infraModel).toBeNull();
    });
  });

  describe('Provider models field', () => {
    it('returns models for a provider', async () => {
      const provider = await db.llmProvider.create({
        data: { name: 'openai', displayName: 'OpenAI' },
      });
      await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          costInputPerMillion: 2.5,
          costOutputPerMillion: 10.0,
        },
      });
      await db.llmModel.create({
        data: {
          providerId: provider.id,
          modelId: 'gpt-4o-mini',
          displayName: 'GPT-4o Mini',
          costInputPerMillion: 0.15,
          costOutputPerMillion: 0.6,
        },
      });

      const response = await request(app)
        .post('/graphql')
        .set('X-API-Key', apiKey)
        .send({
          query: `
            query GetProviderWithModels($id: String!) {
              llmProvider(id: $id) {
                name
                models {
                  modelId
                  displayName
                }
              }
            }
          `,
          variables: { id: provider.id },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.llmProvider.models).toHaveLength(2);

      const modelIds = response.body.data.llmProvider.models.map(
        (m: { modelId: string }) => m.modelId
      );
      expect(modelIds).toContain('gpt-4o');
      expect(modelIds).toContain('gpt-4o-mini');
    });
  });
});

/**
 * Tests for audit logging functionality.
 *
 * Verifies that mutations create audit log entries correctly.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../../../src/server.js';
import { db } from '@valuerank/db';
import type { User, Definition, Tag } from '@valuerank/db';
import { getAuthHeader, TEST_USER } from '../../test-utils.js';
import { queryAuditLogs, getEntityAuditHistory } from '../../../src/services/audit/query.js';

const app = createServer();

describe('Audit Logging', () => {
  let testUser: User;
  let testDefinition: Definition;

  beforeAll(async () => {
    // Create or find the test user
    testUser = await db.user.upsert({
      where: { id: TEST_USER.id },
      create: {
        id: TEST_USER.id,
        email: TEST_USER.email,
        passwordHash: 'test-hash',
      },
      update: {},
    });

    // Create test definition for some tests
    testDefinition = await db.definition.create({
      data: {
        name: 'Audit Test Definition',
        content: { schema_version: 1, preamble: 'Test' },
        createdByUserId: testUser.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.auditLog.deleteMany({
      where: { userId: testUser.id },
    });
    await db.definition.deleteMany({ where: { id: testDefinition.id } });
  });

  beforeEach(async () => {
    // Clean audit logs before each test
    await db.auditLog.deleteMany({
      where: { userId: testUser.id },
    });
  });

  describe('createAuditLog function', () => {
    it('creates audit log entry with all required fields', async () => {
      const mutation = `
        mutation CreateDef($input: CreateDefinitionInput!) {
          createDefinition(input: $input) {
            id
            name
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', getAuthHeader())
        .send({
          query: mutation,
          variables: {
            input: {
              name: 'Audit Log Test Definition',
              content: { preamble: 'Test', template: 'Test', dimensions: [] },
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      const createdDefId = response.body.data.createDefinition.id;

      // Wait a bit for async audit log to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify audit log was created
      const auditLog = await db.auditLog.findFirst({
        where: {
          entityId: createdDefId,
          entityType: 'Definition',
          action: 'CREATE',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.userId).toBe(testUser.id);
      expect(auditLog?.entityType).toBe('Definition');
      expect(auditLog?.action).toBe('CREATE');
      expect(auditLog?.metadata).toMatchObject({
        name: 'Audit Log Test Definition',
      });

      // Cleanup
      await db.auditLog.deleteMany({ where: { entityId: createdDefId } });
      await db.definition.delete({ where: { id: createdDefId } });
    });
  });

  describe('Definition mutations create audit logs', () => {
    it('forkDefinition creates audit log', async () => {
      const mutation = `
        mutation ForkDef($input: ForkDefinitionInput!) {
          forkDefinition(input: $input) {
            id
            name
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', getAuthHeader())
        .send({
          query: mutation,
          variables: {
            input: {
              parentId: testDefinition.id,
              name: 'Forked for Audit Test',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      const forkedDefId = response.body.data.forkDefinition.id;

      // Wait for async audit log
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLog = await db.auditLog.findFirst({
        where: {
          entityId: forkedDefId,
          entityType: 'Definition',
          action: 'CREATE',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.metadata).toMatchObject({
        parentId: testDefinition.id,
      });

      // Cleanup
      await db.auditLog.deleteMany({ where: { entityId: forkedDefId } });
      await db.definition.delete({ where: { id: forkedDefId } });
    });

    it('deleteDefinition creates audit log', async () => {
      // Create a definition to delete
      const defToDelete = await db.definition.create({
        data: {
          name: 'Definition to Delete for Audit',
          content: { schema_version: 1 },
          createdByUserId: testUser.id,
        },
      });

      const mutation = `
        mutation DeleteDef($id: String!) {
          deleteDefinition(id: $id) {
            deletedIds
            count
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', getAuthHeader())
        .send({ query: mutation, variables: { id: defToDelete.id } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();

      // Wait for async audit log
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLog = await db.auditLog.findFirst({
        where: {
          entityId: defToDelete.id,
          entityType: 'Definition',
          action: 'DELETE',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.userId).toBe(testUser.id);

      // Cleanup
      await db.auditLog.deleteMany({ where: { entityId: defToDelete.id } });
      await db.definition.delete({ where: { id: defToDelete.id } });
    });
  });

  describe('Tag mutations create audit logs', () => {
    it('createTag creates audit log', async () => {
      const tagName = `audit-test-tag-${Date.now()}`;
      const mutation = `
        mutation CreateTag($name: String!) {
          createTag(name: $name) {
            id
            name
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', getAuthHeader())
        .send({ query: mutation, variables: { name: tagName } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      const createdTagId = response.body.data.createTag.id;

      // Wait for async audit log
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLog = await db.auditLog.findFirst({
        where: {
          entityId: createdTagId,
          entityType: 'Tag',
          action: 'CREATE',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.metadata).toMatchObject({ name: tagName });

      // Cleanup
      await db.auditLog.deleteMany({ where: { entityId: createdTagId } });
      await db.tag.delete({ where: { id: createdTagId } });
    });

    it('deleteTag creates audit log', async () => {
      // Create a tag to delete
      const tagToDelete = await db.tag.create({
        data: { name: `tag-to-delete-${Date.now()}` },
      });

      const mutation = `
        mutation DeleteTag($id: String!) {
          deleteTag(id: $id) {
            success
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', getAuthHeader())
        .send({ query: mutation, variables: { id: tagToDelete.id } })
        .expect(200);

      expect(response.body.errors).toBeUndefined();

      // Wait for async audit log
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLog = await db.auditLog.findFirst({
        where: {
          entityId: tagToDelete.id,
          entityType: 'Tag',
          action: 'DELETE',
        },
      });

      expect(auditLog).not.toBeNull();

      // Cleanup
      await db.auditLog.deleteMany({ where: { entityId: tagToDelete.id } });
    });
  });

  describe('DefinitionTag mutations create audit logs', () => {
    it('addTagToDefinition creates audit log', async () => {
      // Create a tag
      const tag = await db.tag.create({
        data: { name: `add-tag-test-${Date.now()}` },
      });

      const mutation = `
        mutation AddTag($definitionId: String!, $tagId: String!) {
          addTagToDefinition(definitionId: $definitionId, tagId: $tagId) {
            id
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', getAuthHeader())
        .send({
          query: mutation,
          variables: { definitionId: testDefinition.id, tagId: tag.id },
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();

      // Wait for async audit log
      await new Promise((resolve) => setTimeout(resolve, 100));

      const entityId = `${testDefinition.id}:${tag.id}`;
      const auditLog = await db.auditLog.findFirst({
        where: {
          entityId,
          entityType: 'DefinitionTag',
          action: 'CREATE',
        },
      });

      expect(auditLog).not.toBeNull();

      // Cleanup
      await db.auditLog.deleteMany({ where: { entityId } });
      await db.definitionTag.deleteMany({
        where: { definitionId: testDefinition.id, tagId: tag.id },
      });
      await db.tag.delete({ where: { id: tag.id } });
    });
  });

  describe('Audit log metadata is captured correctly', () => {
    it('updateDefinition captures updated fields in metadata', async () => {
      // Create a definition to update
      const def = await db.definition.create({
        data: {
          name: 'Definition to Update',
          content: { schema_version: 1 },
          createdByUserId: testUser.id,
        },
      });

      const mutation = `
        mutation UpdateDef($id: String!, $input: UpdateDefinitionInput!) {
          updateDefinition(id: $id, input: $input) {
            id
            name
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', getAuthHeader())
        .send({
          query: mutation,
          variables: {
            id: def.id,
            input: { name: 'Updated Name' },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();

      // Wait for async audit log
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLog = await db.auditLog.findFirst({
        where: {
          entityId: def.id,
          entityType: 'Definition',
          action: 'UPDATE',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.metadata).toMatchObject({
        updatedFields: ['name'],
      });

      // Cleanup
      await db.auditLog.deleteMany({ where: { entityId: def.id } });
      await db.definition.delete({ where: { id: def.id } });
    });
  });
});

describe('Audit Query Functions', () => {
  const createdAuditLogIds: string[] = [];
  const testEntityId = `test-entity-${Date.now()}`;
  let testUserId: string;

  beforeAll(async () => {
    // Ensure test user exists
    const testUser = await db.user.upsert({
      where: { id: TEST_USER.id },
      create: {
        id: TEST_USER.id,
        email: TEST_USER.email,
        passwordHash: 'test-hash',
      },
      update: {},
    });
    testUserId = testUser.id;

    // Create some test audit logs
    const logs = await db.auditLog.createMany({
      data: [
        {
          userId: testUserId,
          entityType: 'TestEntity',
          entityId: testEntityId,
          action: 'CREATE',
          metadata: { field: 'value1' },
        },
        {
          userId: testUserId,
          entityType: 'TestEntity',
          entityId: testEntityId,
          action: 'UPDATE',
          metadata: { field: 'value2' },
        },
        {
          userId: testUserId,
          entityType: 'OtherEntity',
          entityId: 'other-entity',
          action: 'DELETE',
          metadata: {},
        },
      ],
    });

    // Get the IDs
    const created = await db.auditLog.findMany({
      where: {
        entityId: { in: [testEntityId, 'other-entity'] },
      },
    });
    createdAuditLogIds.push(...created.map((l) => l.id));
  });

  afterAll(async () => {
    // Cleanup
    if (createdAuditLogIds.length > 0) {
      await db.auditLog.deleteMany({
        where: { id: { in: createdAuditLogIds } },
      });
    }
  });

  describe('queryAuditLogs', () => {
    it('returns all logs without filters', async () => {
      const result = await queryAuditLogs();

      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
      expect(result.hasNextPage).toBeDefined();
    });

    it('filters by entityType', async () => {
      const result = await queryAuditLogs({ entityType: 'TestEntity' });

      expect(result.logs.length).toBeGreaterThanOrEqual(2);
      expect(result.logs.every((l) => l.entityType === 'TestEntity')).toBe(true);
    });

    it('filters by entityId', async () => {
      const result = await queryAuditLogs({ entityId: testEntityId });

      expect(result.logs.length).toBe(2);
      expect(result.logs.every((l) => l.entityId === testEntityId)).toBe(true);
    });

    it('filters by userId', async () => {
      const result = await queryAuditLogs({ userId: testUserId });

      expect(result.logs.every((l) => l.userId === testUserId)).toBe(true);
    });

    it('filters by action', async () => {
      const result = await queryAuditLogs({ action: 'DELETE' });

      expect(result.logs.every((l) => l.action === 'DELETE')).toBe(true);
    });

    it('filters by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const result = await queryAuditLogs({ from: yesterday, to: tomorrow });

      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('supports pagination with first param', async () => {
      const result = await queryAuditLogs(undefined, { first: 1 });

      expect(result.logs.length).toBeLessThanOrEqual(1);
    });

    it('supports pagination with cursor', async () => {
      // Get first page
      const firstPage = await queryAuditLogs(undefined, { first: 1 });

      if (firstPage.hasNextPage && firstPage.endCursor) {
        // Get second page using cursor
        const secondPage = await queryAuditLogs(undefined, {
          first: 1,
          after: firstPage.endCursor,
        });

        expect(secondPage.logs.length).toBeLessThanOrEqual(1);
        // Different logs
        if (secondPage.logs.length > 0 && firstPage.logs.length > 0) {
          expect(secondPage.logs[0]?.id).not.toBe(firstPage.logs[0]?.id);
        }
      }
    });
  });

  describe('getEntityAuditHistory', () => {
    it('returns audit history for specific entity', async () => {
      const history = await getEntityAuditHistory('TestEntity', testEntityId);

      expect(history.length).toBe(2);
      expect(history.every((l) => l.entityType === 'TestEntity')).toBe(true);
      expect(history.every((l) => l.entityId === testEntityId)).toBe(true);
    });

    it('respects limit parameter', async () => {
      const history = await getEntityAuditHistory('TestEntity', testEntityId, 1);

      expect(history.length).toBe(1);
    });

    it('returns empty array for non-existent entity', async () => {
      const history = await getEntityAuditHistory('FakeEntity', 'fake-id');

      expect(history).toEqual([]);
    });
  });
});

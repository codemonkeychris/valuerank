/**
 * Integration tests for user and API key query helpers.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  createUser,
  getUserById,
  getUserByEmail,
  createApiKey,
  getApiKeyByPrefix,
  listApiKeysForUser,
  deleteApiKey,
} from '../src/queries/users.js';

const prisma = new PrismaClient();

// Skip tests if no database URL
const skipIfNoDb = process.env.DATABASE_URL ? describe : describe.skip;

skipIfNoDb('User Queries (Integration)', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.apiKey.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createUser', () => {
    it('creates a user with valid email and password hash', async () => {
      const result = await createUser({
        email: 'test@example.com',
        passwordHash: 'hashed_password_123',
        name: 'Test User',
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
    });

    it('normalizes email to lowercase', async () => {
      const result = await createUser({
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'hash',
      });

      expect(result.email).toBe('test@example.com');
    });

    it('throws on empty email', async () => {
      await expect(
        createUser({ email: '', passwordHash: 'hash' })
      ).rejects.toThrow('Email is required');
    });

    it('throws on invalid email format', async () => {
      await expect(
        createUser({ email: 'not-an-email', passwordHash: 'hash' })
      ).rejects.toThrow('Invalid email format');
    });

    it('throws on duplicate email', async () => {
      await createUser({
        email: 'duplicate@example.com',
        passwordHash: 'hash1',
      });

      await expect(
        createUser({
          email: 'duplicate@example.com',
          passwordHash: 'hash2',
        })
      ).rejects.toThrow('Email already exists');
    });

    it('throws on missing password hash', async () => {
      await expect(
        createUser({ email: 'test@example.com', passwordHash: '' })
      ).rejects.toThrow('Password hash is required');
    });
  });

  describe('getUserById', () => {
    it('returns user when exists', async () => {
      const created = await createUser({
        email: 'byid@example.com',
        passwordHash: 'hash',
      });

      const result = await getUserById(created.id);

      expect(result.id).toBe(created.id);
      expect(result.email).toBe('byid@example.com');
    });

    it('throws NotFoundError when not exists', async () => {
      await expect(getUserById('non-existent-id')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('getUserByEmail', () => {
    it('returns user when exists', async () => {
      await createUser({
        email: 'byemail@example.com',
        passwordHash: 'hash',
      });

      const result = await getUserByEmail('byemail@example.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('byemail@example.com');
    });

    it('returns null when not exists', async () => {
      const result = await getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('is case insensitive', async () => {
      await createUser({
        email: 'case@example.com',
        passwordHash: 'hash',
      });

      const result = await getUserByEmail('CASE@EXAMPLE.COM');

      expect(result).not.toBeNull();
    });
  });

  describe('API Key Operations', () => {
    it('creates an API key for a user', async () => {
      const user = await createUser({
        email: 'apikey@example.com',
        passwordHash: 'hash',
      });

      const apiKey = await createApiKey({
        userId: user.id,
        name: 'Test Key',
        keyHash: 'hashed_key_value',
        keyPrefix: 'vr_test_',
      });

      expect(apiKey.id).toBeDefined();
      expect(apiKey.name).toBe('Test Key');
      expect(apiKey.keyPrefix).toBe('vr_test_');
      expect(apiKey.userId).toBe(user.id);
    });

    it('throws on non-existent user', async () => {
      await expect(
        createApiKey({
          userId: 'non-existent',
          name: 'Test',
          keyHash: 'hash',
          keyPrefix: 'vr_',
        })
      ).rejects.toThrow('User not found');
    });

    it('getApiKeyByPrefix returns key when exists', async () => {
      const user = await createUser({
        email: 'prefix@example.com',
        passwordHash: 'hash',
      });

      await createApiKey({
        userId: user.id,
        name: 'Prefix Key',
        keyHash: 'hash123',
        keyPrefix: 'vr_unique_',
      });

      const result = await getApiKeyByPrefix('vr_unique_');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Prefix Key');
    });

    it('getApiKeyByPrefix returns null when not exists', async () => {
      const result = await getApiKeyByPrefix('non_existent_');

      expect(result).toBeNull();
    });

    it('listApiKeysForUser returns all keys without hashes', async () => {
      const user = await createUser({
        email: 'list@example.com',
        passwordHash: 'hash',
      });

      await createApiKey({
        userId: user.id,
        name: 'Key 1',
        keyHash: 'hash1',
        keyPrefix: 'vr_1_',
      });
      await createApiKey({
        userId: user.id,
        name: 'Key 2',
        keyHash: 'hash2',
        keyPrefix: 'vr_2_',
      });

      const keys = await listApiKeysForUser(user.id);

      expect(keys.length).toBe(2);
      // Verify keyHash is not included
      expect(keys.every((k) => !('keyHash' in k))).toBe(true);
    });

    it('deleteApiKey removes the key', async () => {
      const user = await createUser({
        email: 'delete@example.com',
        passwordHash: 'hash',
      });

      const apiKey = await createApiKey({
        userId: user.id,
        name: 'To Delete',
        keyHash: 'hash',
        keyPrefix: 'vr_del_',
      });

      await deleteApiKey(apiKey.id);

      const keys = await listApiKeysForUser(user.id);
      expect(keys.length).toBe(0);
    });

    it('deleteApiKey throws NotFoundError for non-existent key', async () => {
      await expect(deleteApiKey('non-existent')).rejects.toThrow(
        'ApiKey not found'
      );
    });

    it('cascade deletes API keys when user is deleted', async () => {
      const user = await createUser({
        email: 'cascade@example.com',
        passwordHash: 'hash',
      });

      await createApiKey({
        userId: user.id,
        name: 'Cascaded Key',
        keyHash: 'hash',
        keyPrefix: 'vr_cas_',
      });

      // Delete the user directly
      await prisma.user.delete({ where: { id: user.id } });

      // API key should also be deleted
      const result = await getApiKeyByPrefix('vr_cas_');
      expect(result).toBeNull();
    });
  });
});

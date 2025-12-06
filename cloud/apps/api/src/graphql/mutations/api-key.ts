/**
 * GraphQL mutations for API key management
 *
 * Provides createApiKey mutation for generating secure API keys.
 * Keys are stored as SHA-256 hashes - the full key is only returned once.
 */

import { builder } from '../builder.js';
import { db } from '@valuerank/db';
import { AuthenticationError } from '@valuerank/shared';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../../auth/api-keys.js';
import { CreateApiKeyResultRef } from '../types/api-key.js';

// Input type for creating an API key
const CreateApiKeyInput = builder.inputType('CreateApiKeyInput', {
  fields: (t) => ({
    name: t.string({
      required: true,
      description: 'Human-readable name for the key (e.g., "Claude Desktop", "Cursor IDE")',
      validate: {
        minLength: [1, { message: 'Name is required' }],
        maxLength: [100, { message: 'Name must be 100 characters or less' }],
      },
    }),
  }),
});

// Mutation: createApiKey
builder.mutationField('createApiKey', (t) =>
  t.field({
    type: CreateApiKeyResultRef,
    description: `
      Create a new API key for the current user.
      Requires authentication.

      The full key value is returned ONLY in this response.
      Store it securely - it cannot be retrieved later.
    `,
    args: {
      input: t.arg({ type: CreateApiKeyInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      // Require authentication
      if (!ctx.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { name } = args.input;
      const userId = ctx.user.id;

      ctx.log.debug({ userId, name }, 'Creating API key');

      // Generate a secure random API key
      const fullKey = generateApiKey();

      // Hash the key for storage (never store plaintext)
      const keyHash = hashApiKey(fullKey);

      // Extract prefix for display (vr_ + 7 chars)
      const keyPrefix = getKeyPrefix(fullKey);

      // Store the API key record
      const apiKey = await db.apiKey.create({
        data: {
          userId,
          name,
          keyHash,
          keyPrefix,
        },
      });

      ctx.log.info(
        { userId, apiKeyId: apiKey.id, keyPrefix },
        'API key created'
      );

      // Return the full key only in this response
      return {
        apiKey: {
          id: apiKey.id,
          userId: apiKey.userId,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          lastUsed: apiKey.lastUsed,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
        key: fullKey,
      };
    },
  })
);

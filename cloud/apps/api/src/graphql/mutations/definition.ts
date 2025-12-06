import { builder } from '../builder.js';
import { db } from '@valuerank/db';
import type { Prisma } from '@valuerank/db';
import { DefinitionRef } from '../types/refs.js';

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Ensures content has schema_version field.
 * If not present, adds the current version.
 */
function ensureSchemaVersion(
  content: Record<string, unknown>
): Prisma.InputJsonValue {
  // If schema_version exists, keep it; otherwise add current version
  if (!('schema_version' in content)) {
    return { schema_version: CURRENT_SCHEMA_VERSION, ...content };
  }

  return content as Prisma.InputJsonValue;
}

// Input type for creating a definition
const CreateDefinitionInput = builder.inputType('CreateDefinitionInput', {
  fields: (t) => ({
    name: t.string({
      required: true,
      description: 'Name of the definition',
      validate: {
        minLength: [1, { message: 'Name is required' }],
        maxLength: [255, { message: 'Name must be 255 characters or less' }],
      },
    }),
    content: t.field({
      type: 'JSON',
      required: true,
      description: 'JSONB content for the definition',
    }),
    parentId: t.string({
      required: false,
      description: 'Optional parent definition ID for forking',
    }),
  }),
});

// Mutation: createDefinition
builder.mutationField('createDefinition', (t) =>
  t.field({
    type: DefinitionRef,
    description: 'Create a new definition. Automatically adds schema_version to content if not present.',
    args: {
      input: t.arg({ type: CreateDefinitionInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const { name, content, parentId } = args.input;

      ctx.log.debug({ name, parentId }, 'Creating definition');

      // Validate content is an object
      if (typeof content !== 'object' || content === null || Array.isArray(content)) {
        throw new Error('Content must be a JSON object');
      }

      // Ensure schema_version is present
      const processedContent = ensureSchemaVersion(content as Record<string, unknown>);

      // If parentId provided, verify it exists
      if (parentId !== null && parentId !== undefined && parentId !== '') {
        const parent = await db.definition.findUnique({
          where: { id: parentId },
        });
        if (!parent) {
          throw new Error(`Parent definition not found: ${parentId}`);
        }
      }

      const definition = await db.definition.create({
        data: {
          name,
          content: processedContent,
          parentId: parentId ?? null,
        },
      });

      ctx.log.info({ definitionId: definition.id, name }, 'Definition created');
      return definition;
    },
  })
);

// Input type for forking a definition
const ForkDefinitionInput = builder.inputType('ForkDefinitionInput', {
  fields: (t) => ({
    parentId: t.string({
      required: true,
      description: 'ID of the definition to fork from',
    }),
    name: t.string({
      required: true,
      description: 'Name for the forked definition',
      validate: {
        minLength: [1, { message: 'Name is required' }],
        maxLength: [255, { message: 'Name must be 255 characters or less' }],
      },
    }),
    content: t.field({
      type: 'JSON',
      required: false,
      description: 'Optional content override. If not provided, inherits from parent.',
    }),
  }),
});

// Mutation: forkDefinition
builder.mutationField('forkDefinition', (t) =>
  t.field({
    type: DefinitionRef,
    description: 'Fork an existing definition. Inherits content from parent if not provided.',
    args: {
      input: t.arg({ type: ForkDefinitionInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const { parentId, name, content } = args.input;

      ctx.log.debug({ parentId, name }, 'Forking definition');

      // Fetch parent - required for fork
      const parent = await db.definition.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new Error(`Parent definition not found: ${parentId}`);
      }

      // Determine content: use provided content or inherit from parent
      let finalContent: Prisma.InputJsonValue;

      if (content !== null && content !== undefined) {
        // Validate provided content
        if (typeof content !== 'object' || Array.isArray(content)) {
          throw new Error('Content must be a JSON object');
        }
        finalContent = ensureSchemaVersion(content as Record<string, unknown>);
      } else {
        // Inherit from parent
        finalContent = parent.content as Prisma.InputJsonValue;
      }

      const definition = await db.definition.create({
        data: {
          name,
          content: finalContent,
          parentId,
        },
      });

      ctx.log.info(
        { definitionId: definition.id, name, parentId },
        'Definition forked'
      );
      return definition;
    },
  })
);

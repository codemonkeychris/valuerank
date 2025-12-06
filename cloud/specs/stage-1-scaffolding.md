# Stage 1: Project Scaffolding & Infrastructure

> Part of [High-Level Implementation Plan](./high-level.md)
>
> Must adhere to [Project Constitution](../CLAUDE.md)

**Goal:** Establish the foundational project structure, build system, and local development environment.

---

## Deliverables Summary

| Deliverable | Description |
|-------------|-------------|
| Turborepo monorepo | `apps/api`, `apps/web`, `packages/db`, `packages/shared` |
| Docker Compose | Local PostgreSQL (v16) |
| TypeScript config | Strict mode across all packages |
| ESLint/Prettier | Consistent code style |
| Logger abstraction | pino-based structured logging |
| Environment config | Type-safe env variable handling |
| npm scripts | dev, build, test, lint |

---

## 1. Folder Structure

```
cloud/
├── apps/
│   ├── api/                          # GraphQL API server
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── server.ts             # Express/Yoga setup
│   │   │   ├── config.ts             # Environment config
│   │   │   └── health.ts             # Health check endpoint
│   │   ├── tests/
│   │   │   └── health.test.ts        # Health check tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # React frontend
│       ├── src/
│       │   ├── main.tsx              # React entry
│       │   ├── App.tsx               # Root component
│       │   ├── vite-env.d.ts         # Vite types
│       │   └── index.css             # Tailwind entry
│       ├── public/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── postcss.config.js
│
├── packages/
│   ├── db/                           # Database client & types
│   │   ├── src/
│   │   │   ├── index.ts              # Re-exports
│   │   │   └── client.ts             # Prisma client singleton
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Minimal schema (users table only)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                       # Shared utilities
│       ├── src/
│       │   ├── index.ts              # Re-exports
│       │   ├── logger.ts             # Pino logger abstraction
│       │   ├── env.ts                # Environment validation
│       │   └── errors.ts             # Custom error classes
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   └── (empty, for future Dockerfiles)
│
├── docker-compose.yml                # Local PostgreSQL
├── package.json                      # Workspace root
├── turbo.json                        # Turborepo config
├── tsconfig.base.json                # Shared TS config
├── .eslintrc.cjs                     # ESLint config
├── .prettierrc                       # Prettier config
├── .env.example                      # Environment template
├── .gitignore
└── README.md                         # Setup instructions
```

---

## 2. Package Configuration

### 2.1 Root package.json

```json
{
  "name": "cloud-valuerank",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "typecheck": "turbo typecheck",
    "db:migrate": "npm run migrate --workspace=@valuerank/db",
    "db:generate": "npm run generate --workspace=@valuerank/db",
    "db:studio": "npm run studio --workspace=@valuerank/db",
    "db:push": "npm run push --workspace=@valuerank/db",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.3.3",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.2.0"
  },
  "packageManager": "npm@10.2.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 2.2 turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "lint:fix": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 2.3 tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  }
}
```

---

## 3. Docker Compose

### docker-compose.yml

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: valuerank-postgres
    environment:
      POSTGRES_USER: valuerank
      POSTGRES_PASSWORD: valuerank
      POSTGRES_DB: valuerank
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U valuerank -d valuerank"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

## 4. Apps Configuration

### 4.1 apps/api

#### apps/api/package.json

```json
{
  "name": "@valuerank/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@valuerank/db": "workspace:*",
    "@valuerank/shared": "workspace:*",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "tsx": "^4.6.2",
    "vitest": "^2.1.0"
  }
}
```

#### apps/api/src/index.ts

```typescript
import { createServer } from './server.js';
import { config } from './config.js';
import { createLogger } from '@valuerank/shared';

const log = createLogger('api');

async function main() {
  const app = createServer();

  app.listen(config.PORT, () => {
    log.info({ port: config.PORT }, 'API server started');
  });
}

main().catch((err) => {
  log.error({ err }, 'Failed to start API server');
  process.exit(1);
});
```

#### apps/api/src/server.ts

```typescript
import express from 'express';
import cors from 'cors';
import { healthRouter } from './health.js';
import { createLogger } from '@valuerank/shared';

const log = createLogger('server');

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      log.info(
        { method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start },
        'Request completed'
      );
    });
    next();
  });

  // Routes
  app.use('/health', healthRouter);

  // Root
  app.get('/', (_req, res) => {
    res.json({ name: 'Cloud ValueRank API', version: '0.1.0' });
  });

  return app;
}
```

#### apps/api/src/health.ts

```typescript
import { Router } from 'express';
import { db } from '@valuerank/db';
import { createLogger } from '@valuerank/shared';

const log = createLogger('health');

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
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
});
```

#### apps/api/src/config.ts

```typescript
import { getEnv } from '@valuerank/shared';

export const config = {
  PORT: getEnv('PORT', '3001'),
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  DATABASE_URL: getEnv('DATABASE_URL'),
} as const;
```

### 4.2 apps/web

#### apps/web/package.json

```json
{
  "name": "@valuerank/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "vite": "^5.0.10"
  }
}
```

#### apps/web/src/App.tsx

```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Cloud ValueRank</h1>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-gray-600">Scaffolding complete. Ready for Stage 2.</p>
      </main>
    </div>
  );
}

export default App;
```

---

## 5. Packages Configuration

### 5.1 packages/shared

#### packages/shared/package.json

```json
{
  "name": "@valuerank/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "pino": "^8.17.0",
    "pino-pretty": "^10.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0"
  }
}
```

#### packages/shared/src/index.ts

```typescript
export { logger, createLogger } from './logger.js';
export { getEnv, getEnvRequired } from './env.js';
export { AppError, NotFoundError, ValidationError } from './errors.js';
```

#### packages/shared/src/logger.ts

```typescript
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export function createLogger(context: string) {
  return logger.child({ context });
}
```

#### packages/shared/src/env.ts

```typescript
/**
 * Get environment variable with optional default.
 * Returns default if not set, throws if required and not set.
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Required environment variable ${key} is not set`);
}

/**
 * Get required environment variable. Throws if not set.
 */
export function getEnvRequired(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}
```

#### packages/shared/src/errors.ts

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404, { resource, id });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, { details });
  }
}
```

### 5.2 packages/db

#### packages/db/package.json

```json
{
  "name": "@valuerank/db",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "push": "prisma db push",
    "studio": "prisma studio",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0"
  }
}
```

#### packages/db/src/index.ts

```typescript
export { db } from './client.js';
export type { PrismaClient } from '@prisma/client';
```

#### packages/db/src/client.ts

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

#### packages/db/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Minimal schema for Stage 1 - just to verify Prisma works
// Full schema will be added in Stage 2
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

---

## 6. Linting & Formatting

### .eslintrc.cjs

```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    // No any types (per CLAUDE.md)
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',

    // Strict null checks
    '@typescript-eslint/strict-boolean-expressions': 'warn',

    // No console.log (per CLAUDE.md - use logger)
    'no-console': 'error',

    // Consistent imports
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // Unused vars
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'node_modules', '*.js', '*.cjs'],
};
```

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true
}
```

---

## 7. Environment Configuration

### .env.example

```bash
# Database
DATABASE_URL="postgresql://valuerank:valuerank@localhost:5432/valuerank"

# API
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug

# LLM Providers (not needed for Stage 1, but documented)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
```

---

## 8. Test Configuration

### apps/api/vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
      },
    },
  },
});
```

### apps/api/tests/health.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../src/server.js';

// Mock the db module
vi.mock('@valuerank/db', () => ({
  db: {
    $queryRaw: vi.fn(),
  },
}));

describe('Health endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns healthy when database is connected', async () => {
    const { db } = await import('@valuerank/db');
    vi.mocked(db.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

    const app = createServer();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.services.database).toBe('connected');
  });

  it('returns unhealthy when database is disconnected', async () => {
    const { db } = await import('@valuerank/db');
    vi.mocked(db.$queryRaw).mockRejectedValue(new Error('Connection failed'));

    const app = createServer();
    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
    expect(response.body.services.database).toBe('disconnected');
  });
});
```

---

## 9. Exit Criteria Checklist

Before marking Stage 1 complete, verify all of the following:

### Infrastructure

- [ ] `docker-compose up -d` runs PostgreSQL locally without errors
- [ ] PostgreSQL container passes health check
- [ ] Can connect to PostgreSQL with `psql` or Prisma Studio

### Build System

- [ ] `npm install` completes without errors at workspace root
- [ ] `npm run build` compiles all packages without TypeScript errors
- [ ] `turbo` caches builds correctly (second build is instant)

### Development

- [ ] `npm run dev` starts both API (port 3001) and web (port 3000)
- [ ] API responds to `GET /health` with status
- [ ] Web shows basic React page with Tailwind styles
- [ ] Hot reload works for both API and web

### Database

- [ ] `npm run db:generate` generates Prisma client
- [ ] `npm run db:push` creates tables in PostgreSQL
- [ ] `npm run db:studio` opens Prisma Studio

### Code Quality

- [ ] TypeScript compiles in strict mode with no errors
- [ ] `npm run lint` passes (no ESLint errors)
- [ ] No `any` types in codebase
- [ ] Logger is used (no console.log)

### Testing

- [ ] `npm run test` runs without errors
- [ ] Health endpoint test passes
- [ ] Coverage meets minimum thresholds (80% lines)

### Documentation

- [ ] `.env.example` documents all required variables
- [ ] README.md has quick start instructions

---

## 10. Implementation Notes

### Package Internal Imports

Use `.js` extension for local imports (required for NodeNext module resolution):

```typescript
// Correct
import { createServer } from './server.js';

// Incorrect (will fail at runtime)
import { createServer } from './server';
```

### Workspace Dependencies

Reference workspace packages with `workspace:*`:

```json
{
  "dependencies": {
    "@valuerank/shared": "workspace:*"
  }
}
```

### Prisma Client Generation

The Prisma client must be generated before other packages can build:

```bash
npm run db:generate  # Run first
npm run build        # Then build all
```

Turborepo handles this automatically via `dependsOn` configuration.

---

## 11. Final Task

After completing Stage 1 implementation, update the high-level spec to mark it complete:

**File:** `cloud/specs/high-level.md`

Add a checkbox to Stage 1 header:

```markdown
## Stage 1: Project Scaffolding & Infrastructure [x]
```

This tracks progress and signals readiness for Stage 2.

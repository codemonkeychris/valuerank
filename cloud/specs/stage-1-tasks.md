# Stage 1: Task Checklist

> **Spec:** [stage-1-scaffolding.md](./stage-1-scaffolding.md) | **Plan:** [stage-1-plan.md](./stage-1-plan.md)

---

## Phase 1: Root Infrastructure

- [ ] **1.1** Create cloud directory structure
  - `cloud/apps/api/`, `cloud/apps/web/`
  - `cloud/packages/db/`, `cloud/packages/shared/`
  - `cloud/docker/`

- [ ] **1.2** Create `docker-compose.yml`
  - PostgreSQL 16-alpine
  - Port 5432, user/pass: valuerank
  - Health check configured

- [ ] **1.3** Create root `package.json` + `turbo.json`
  - npm workspaces for apps/* and packages/*
  - Turborepo task configuration

- [ ] **1.4** Create `tsconfig.base.json`
  - strict: true
  - noImplicitAny, strictNullChecks, noUncheckedIndexedAccess

- [ ] **1.5** Create `.eslintrc.cjs` + `.prettierrc`
  - No any types rule
  - No console.log rule
  - Consistent type imports

- [ ] **1.6** Create `.env.example` + `.gitignore`
  - DATABASE_URL, PORT, NODE_ENV, LOG_LEVEL
  - Ignore node_modules, dist, .env, .turbo

---

## Phase 2: Shared Packages

### packages/shared

- [ ] **2.1** Create `packages/shared/package.json` + `tsconfig.json`
  - Dependencies: pino, pino-pretty

- [ ] **2.2** Create `packages/shared/src/logger.ts`
  - pino logger with pino-pretty in dev
  - `createLogger(context)` function

- [ ] **2.3** Create `packages/shared/src/env.ts`
  - `getEnv(key, default?)` function
  - `getEnvRequired(key)` function

- [ ] **2.4** Create `packages/shared/src/errors.ts`
  - `AppError` base class
  - `NotFoundError`, `ValidationError`

- [ ] **2.5** Create `packages/shared/src/index.ts`
  - Re-export logger, env, errors

- [ ] **2.5a** Create `packages/shared/vitest.config.ts`
  - Node environment

- [ ] **2.5b** Create `packages/shared/tests/env.test.ts`
  - Test getEnv with/without defaults
  - Test getEnvRequired throws when missing

- [ ] **2.5c** Create `packages/shared/tests/errors.test.ts`
  - Test AppError, NotFoundError, ValidationError

### packages/db

- [ ] **2.6** Create `packages/db/package.json` + `tsconfig.json`
  - Dependencies: @prisma/client, prisma

- [ ] **2.7** Create `packages/db/prisma/schema.prisma`
  - PostgreSQL datasource
  - Minimal User model

- [ ] **2.8** Create `packages/db/src/client.ts` + `index.ts`
  - Prisma client singleton
  - Dev-friendly logging

---

## Phase 3: API Application

- [ ] **3.1** Create `apps/api/package.json` + `tsconfig.json`
  - Dependencies: express, cors, @valuerank/shared, @valuerank/db
  - DevDeps: tsx, vitest, supertest

- [ ] **3.2** Create `apps/api/src/config.ts`
  - PORT, NODE_ENV, DATABASE_URL

- [ ] **3.3** Create `apps/api/src/health.ts`
  - GET /health endpoint
  - Database connection check

- [ ] **3.4** Create `apps/api/src/server.ts`
  - Express app with cors, json middleware
  - Request logging middleware
  - Health router mounted

- [ ] **3.5** Create `apps/api/src/index.ts`
  - Start server on configured port
  - Structured logging for startup

- [ ] **3.6** Create `apps/api/vitest.config.ts`
  - Node environment
  - Coverage thresholds: 80% lines, 75% branches

- [ ] **3.7** Create `apps/api/tests/health.test.ts`
  - Test healthy response when DB connected
  - Test unhealthy response when DB disconnected

---

## Phase 4: Web Application

- [ ] **4.1** Create `apps/web/package.json` + `tsconfig.json`
  - Dependencies: react, react-dom
  - DevDeps: vite, @vitejs/plugin-react, tailwindcss

- [ ] **4.2** Create `apps/web/vite.config.ts`
  - React plugin
  - Port 3000

- [ ] **4.3** Create `apps/web/tailwind.config.js` + `postcss.config.js`
  - Content paths for src/**/*.tsx

- [ ] **4.4** Create `apps/web/index.html`
  - Root div, script module src

- [ ] **4.5** Create `apps/web/src/main.tsx` + `index.css` + `vite-env.d.ts`
  - React 18 createRoot
  - Tailwind directives

- [ ] **4.6** Create `apps/web/src/App.tsx`
  - Basic layout with header
  - Tailwind styling

---

## Phase 5: Verification

- [ ] **5.1** Verify build pipeline
  ```bash
  cd cloud && npm install && npm run build
  ```

- [ ] **5.2** Verify database
  ```bash
  docker-compose up -d
  npm run db:generate
  npm run db:push
  npm run db:studio
  ```

- [ ] **5.3** Verify dev mode
  ```bash
  npm run dev
  # API: http://localhost:3001
  # Web: http://localhost:3000
  ```

- [ ] **5.4** Verify health endpoint
  ```bash
  curl http://localhost:3001/health
  # Should return: {"status":"healthy",...}
  ```

- [ ] **5.5** Verify tests
  ```bash
  npm run test
  ```

- [ ] **5.6** Verify lint
  ```bash
  npm run lint
  ```

- [ ] **5.7** Create `cloud/README.md`
  - Quick start instructions
  - Available npm scripts

---

## Phase 6: Completion

- [ ] **6.1** Update `cloud/specs/high-level.md`
  - Change `[ ]` to `[x]` for Stage 1

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Root Infrastructure | 6 | ⬜ |
| 2. Shared Packages | 11 | ⬜ |
| 3. API Application | 7 | ⬜ |
| 4. Web Application | 6 | ⬜ |
| 5. Verification | 7 | ⬜ |
| 6. Completion | 1 | ⬜ |
| **Total** | **38** | |

---

## Exit Criteria

Before marking complete, all items in [stage-1-scaffolding.md § Exit Criteria](./stage-1-scaffolding.md#9-exit-criteria-checklist) must pass.

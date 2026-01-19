# Implementation Quality Checklist

**Purpose**: Validate code quality during implementation
**Feature**: [tasks.md](../tasks.md)

## File Size Limits (per constitution § File Size Limits)

- [ ] All service files < 400 lines
  - `xlsx/index.ts` < 400 lines
  - `xlsx/workbook.ts` < 400 lines
  - `xlsx/worksheets.ts` < 400 lines
  - `xlsx/charts.ts` < 400 lines
  - `xlsx/formatting.ts` < 400 lines
  - `xlsx/types.ts` < 400 lines
- [ ] Route handler addition to `export.ts` keeps file < 400 lines
- [ ] If any file exceeds limit, split into sub-modules per constitution guidance

## TypeScript Standards (per constitution § TypeScript Standards)

- [ ] No `any` types - use proper typing for exceljs objects
  - Reference: Constitution "No `any` Types" section
- [ ] Strict mode enabled (project-wide, verify not bypassed)
- [ ] Explicit function signatures on all exported functions
- [ ] Use `type` for data shapes, `interface` for contracts
- [ ] Empty arrays explicitly typed (e.g., `const rows: TranscriptRow[] = []`)

## Logging Standards (per constitution § Logging Standards)

- [ ] Use `createLogger('export:xlsx')` - never console.log
  - Reference: Constitution "Logger Abstraction" section
- [ ] Structured logging with objects: `log.info({ runId, transcriptCount }, 'message')`
- [ ] Log levels appropriate:
  - `error`: Export failures, file generation errors
  - `warn`: Truncated responses, missing analysis data
  - `info`: Export started, export completed with stats
  - `debug`: Worksheet generation details

## Error Handling (per constitution § Error Handling)

- [ ] Use existing error classes: `NotFoundError`, `ValidationError`, `AuthenticationError`
  - Reference: Constitution "Custom Error Classes" section
- [ ] Route handler uses try/catch with `next(err)` pattern
- [ ] Descriptive error messages for:
  - Run not found (404)
  - Run not completed (400)
  - Authentication required (401)
  - Empty run / no transcripts (400)

## Code Organization (per constitution § Code Organization)

- [ ] Import order: Node built-ins → External packages → Internal packages → Relative imports
  - Reference: Constitution "Import Order" section
- [ ] exceljs import at top of relevant files
- [ ] Types imported with `import type` where appropriate

## Database Access (per constitution § Database Access)

- [ ] Use Prisma with proper typing for transcript queries
- [ ] Include scenario relation in transcript query
- [ ] Filter soft-deleted records (`deletedAt: null`) if applicable
  - Reference: Constitution "Soft Delete Pattern" section

## URL/Path Construction

- [ ] No hardcoded URLs for services
- [ ] Filename generation uses consistent pattern: `valuerank_<runId>_<date>.xlsx`
- [ ] Use environment variables for any configurable paths

## Security

- [ ] Authentication check matches existing CSV export pattern
- [ ] No sensitive data logged (transcript content truncated in logs)
- [ ] Run ID validated before database query

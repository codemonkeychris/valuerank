# Implementation Plan: Excel Export with Charts

**Branch**: `feat/024-excel-export` | **Date**: 2026-01-19 | **Spec**: [spec.md](./spec.md)

## Summary

Add Excel (XLSX) export capability **alongside the existing CSV export** (both formats will be supported). The new XLSX export generates multi-worksheet workbooks with charts using the `exceljs` library. Follows the existing CSV export pattern with a new REST endpoint and modular service structure.

> **Note**: This feature adds a new export format. The existing CSV export at `/api/export/runs/:id/csv` remains unchanged and fully supported.

---

## Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Version** | TypeScript 5.3+ (strict mode) |
| **Runtime** | Node.js 20+ with ES Modules |
| **Framework** | Express 4.x (REST), GraphQL Yoga (GraphQL) |
| **Database** | PostgreSQL via Prisma |
| **Testing** | Vitest with 80% coverage target |
| **Build** | Turborepo monorepo |
| **Primary Dependencies** | `exceljs` (new), existing export services |
| **Performance Goals** | < 15 seconds for 500 transcripts (SC-001) |
| **Constraints** | File size < 400 lines per constitution |

---

## Constitution Check

**Status**: PASS

### File Size Limits (Constitution § File Size Limits)
- [x] Service files < 400 lines - Will split xlsx service into multiple modules
- [x] Route handlers < 400 lines - Single endpoint, minimal logic

### TypeScript Standards (Constitution § TypeScript Standards)
- [x] No `any` types - Use proper typing for exceljs
- [x] Strict mode - Project already configured
- [x] Explicit function signatures - Will type all exports

### Testing Requirements (Constitution § Testing Requirements)
- [x] 80% line coverage minimum
- [x] Test file location: `apps/api/tests/services/export/`
- [x] Mock database and file generation

### Logging Standards (Constitution § Logging Standards)
- [x] Use `createLogger('export:xlsx')`
- [x] Structured logging for export operations
- [x] No console.log

### Error Handling (Constitution § Error Handling)
- [x] Use existing `AppError`, `NotFoundError`, `ValidationError`
- [x] Return HTTP 400 for non-COMPLETED runs

---

## Architecture Decisions

### Decision 1: Library Selection

**Chosen**: `exceljs` npm package

**Rationale**:
- Suggested in GitHub issue #144
- Native Excel chart support (bar, stacked bar, conditional formatting)
- Streaming write capability for large exports
- Active maintenance, TypeScript support
- Used by similar projects (Apache ECharts export plugins)

**Alternatives Considered**:
- `xlsx` (SheetJS): No native chart support, would require image embedding
- `excel4node`: Less active, fewer features

**Tradeoffs**:
- Pros: Full-featured, charts work natively in Excel
- Cons: Larger bundle size (~2MB), learning curve for chart API

### Decision 2: Service Module Structure

**Chosen**: Split xlsx service into focused modules (< 400 lines each)

**Rationale**:
- Constitution requires files < 400 lines
- Excel generation involves distinct concerns: worksheets, charts, formatting
- Follows existing pattern in `services/export/` directory

**Structure**:
```
services/export/
├── index.ts           # Re-exports (existing)
├── csv.ts             # CSV export (existing)
├── xlsx/              # NEW: Excel export modules
│   ├── index.ts       # Public API: generateXlsx()
│   ├── workbook.ts    # Workbook creation, worksheet management
│   ├── worksheets.ts  # Data worksheet builders
│   ├── charts.ts      # Chart configuration and insertion
│   ├── formatting.ts  # Styles, conditional formatting
│   └── types.ts       # TypeScript types for xlsx
```

### Decision 3: Data Aggregation Strategy

**Chosen**: Compute statistics in TypeScript from transcripts

**Rationale**:
- Analysis data already computed and stored in `AnalysisResult.output`
- Can reuse existing MCP formatter functions for consistency
- Avoids dependency on Python analysis pipeline for export

**Data Sources**:
- Raw Data: Query `transcripts` table with `scenario` relation
- Model Summary: Compute from transcript decision codes
- Analysis Worksheets: Read from `AnalysisResult.output` JSONB

### Decision 4: Response Delivery

**Chosen**: Stream binary response (no server storage)

**Rationale**:
- Matches existing CSV export pattern
- Reduces storage costs and cleanup complexity
- `exceljs` supports streaming to response

**Implementation**:
```typescript
// Stream workbook directly to response
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
await workbook.xlsx.write(res);
```

---

## Project Structure

### Modified Files

```
cloud/apps/api/
├── package.json                    # Add exceljs dependency
├── src/
│   ├── routes/
│   │   └── export.ts               # Add /runs/:id/xlsx endpoint (CSV endpoint unchanged)
│   └── services/
│       └── export/
│           ├── index.ts            # Re-export xlsx functions
│           ├── csv.ts              # UNCHANGED - existing CSV export
│           └── xlsx/               # NEW directory
│               ├── index.ts        # generateExcelExport()
│               ├── workbook.ts     # createWorkbook(), addWorksheet()
│               ├── worksheets.ts   # buildRawDataSheet(), buildModelSummarySheet(), etc.
│               ├── charts.ts       # addBarChart(), addStackedBarChart()
│               ├── formatting.ts   # applyTableStyle(), applyConditionalFormat()
│               └── types.ts        # XlsxExportOptions, WorksheetConfig, etc.
└── tests/
    └── services/
        └── export/
            └── xlsx/               # NEW directory
                ├── workbook.test.ts
                ├── worksheets.test.ts
                ├── charts.test.ts
                └── integration.test.ts
```

### New Dependencies

```json
{
  "dependencies": {
    "exceljs": "^4.4.0"
  }
}
```

---

## Worksheet Architecture

### Worksheet Order and Content

| # | Worksheet | Type | Source Data | Charts |
|---|-----------|------|-------------|--------|
| 1 | Raw Data | data | transcripts + scenarios | None |
| 2 | Model Summary | summary | computed from transcripts | None |
| 3 | Charts | chart | Model Summary data | Bar chart (mean scores), Stacked bar (decision distribution) |
| 4 | Model Agreement | analysis | AnalysisResult.output | Conditional formatting heatmap |
| 5 | Contested Scenarios | analysis | AnalysisResult.output | None |
| 6 | Dimension Impact | analysis | AnalysisResult.output | Horizontal bar chart |
| 7 | Methods | documentation | Static text + warnings | None |

### Conditional Worksheet Generation

- **Model Agreement**: Only if run has 2+ models
- **Dimension Impact**: Only if analysis data available
- **Contested Scenarios**: Only if analysis data available
- **Charts worksheet**: Always (at least Model Summary chart)

---

## API Contract

### REST Endpoint

```
GET /api/export/runs/:id/xlsx
```

**Request**:
- Requires authentication (same as CSV export)
- Path parameter: `id` (run ID)

**Response (Success)**:
- Status: 200
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="valuerank_<runId>_<date>.xlsx"`
- Body: Binary XLSX file

**Response (Error)**:
- 400: Run not in COMPLETED status
- 401: Authentication required
- 404: Run not found

---

## Performance Considerations

1. **Streaming**: Use `workbook.xlsx.write(res)` for memory efficiency
2. **Batch queries**: Single query for transcripts with scenario join
3. **Lazy worksheet building**: Only create worksheets that have data
4. **Cell limit awareness**: Truncate responses > 32,767 chars

---

## Testing Strategy

### Unit Tests
- `workbook.test.ts`: Workbook creation, worksheet management
- `worksheets.test.ts`: Each worksheet builder function
- `charts.test.ts`: Chart configuration generation
- `formatting.test.ts`: Style application, conditional formatting

### Integration Tests
- `integration.test.ts`: Full export flow with mock data
- Verify file opens in Excel (validate XLSX structure)
- Test edge cases: empty run, single model, missing analysis

### Mocking
- Mock Prisma queries for transcript/analysis data
- Mock `exceljs` workbook for unit tests
- Use real `exceljs` for integration tests (validate output)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large file generation timeout | Stream response, test with 1000+ transcripts |
| Chart compatibility issues | Test in Excel, Google Sheets, LibreOffice |
| Memory exhaustion | Use streaming writes, avoid loading all cells in memory |
| exceljs API changes | Pin version, add type tests |

# Testing Quality Checklist

**Purpose**: Validate test coverage and quality
**Feature**: [tasks.md](../tasks.md)

## Coverage Requirements (per constitution § Testing Requirements)

- [ ] Line coverage ≥ 80% for new xlsx module
  - Reference: Constitution "Coverage Targets" section
  - Command: `npx turbo run test:coverage`
- [ ] Branch coverage ≥ 75% for new xlsx module
- [ ] Function coverage ≥ 80% for new xlsx module

## Test Structure (per constitution § Testing Requirements)

- [ ] Test files located in `cloud/apps/api/tests/services/export/xlsx/`
  - Reference: Constitution "Test Files Location" section
- [ ] Describe blocks match module structure:
  - `describe('worksheets')` with nested `describe('buildRawDataSheet')`, etc.
  - `describe('charts')` with nested `describe('addBarChart')`, etc.
- [ ] Clear test names: `it('creates worksheet with correct column headers')`

## Pre-Commit Requirements

- [ ] All tests pass before commit
  - Command: `DATABASE_URL="..." JWT_SECRET="..." npx turbo run test`
- [ ] Build succeeds
  - Command: `npx turbo build --force`
- [ ] Lint passes
  - Command: `npx turbo lint --force`

## Unit Tests

### worksheets.test.ts
- [ ] Test buildRawDataSheet() creates correct headers
- [ ] Test buildRawDataSheet() maps transcript data correctly
- [ ] Test buildRawDataSheet() truncates responses > 32,767 chars
- [ ] Test buildModelSummarySheet() computes mean correctly
- [ ] Test buildModelSummarySheet() computes std dev correctly
- [ ] Test buildModelAgreementSheet() with 2+ models
- [ ] Test buildModelAgreementSheet() handles single model (skipped)
- [ ] Test buildContestedScenariosSheet() returns top 10
- [ ] Test buildDimensionImpactSheet() ranks by effect size
- [ ] Test buildMethodsSheet() includes methodology text

### charts.test.ts
- [ ] Test addBarChart() creates valid chart config
- [ ] Test addStackedBarChart() creates valid chart config
- [ ] Test chart data ranges reference correct cells
- [ ] Test chart has title, axis labels, legend

### workbook.test.ts
- [ ] Test createWorkbook() returns valid Workbook instance
- [ ] Test worksheet ordering is correct
- [ ] Test worksheet names are ≤ 31 characters

### formatting.test.ts
- [ ] Test applyTableStyle() enables auto-filter
- [ ] Test conditional formatting applies color scales
- [ ] Test header styling (bold, background)

## Integration Tests

### integration.test.ts
- [ ] Test generateExcelExport() with valid completed run
- [ ] Test generateExcelExport() rejects PENDING run (400)
- [ ] Test generateExcelExport() rejects RUNNING run (400)
- [ ] Test generateExcelExport() returns 404 for missing run
- [ ] Test generateExcelExport() requires authentication (401)
- [ ] Test generated XLSX is valid (can be read back by exceljs)
- [ ] Test with empty transcripts returns error
- [ ] Test with single model (no Model Agreement sheet)
- [ ] Test with missing analysis data (analysis sheets skipped)

## Mocking Strategy (per constitution § What to Test)

- [ ] Mock Prisma queries for transcript/analysis data
  - Reference: Constitution "Mock: Database, external APIs"
- [ ] Mock exceljs Workbook for unit tests where appropriate
- [ ] Use real exceljs for integration tests to validate output structure
- [ ] Mock authentication middleware in route tests

## Edge Case Coverage

- [ ] Empty run (no transcripts) → 400 error
- [ ] Run with only error transcripts → exports with error states
- [ ] Single model → charts render, Model Agreement skipped
- [ ] Very long responses → truncated with indicator
- [ ] Special characters in model names → properly escaped
- [ ] Unicode in decision text → UTF-8 preserved
- [ ] Worksheet name > 31 chars → truncated

## Performance Testing

- [ ] Test with 500+ transcripts completes in < 15 seconds (SC-001)
- [ ] Memory usage reasonable during large export
- [ ] Streaming response doesn't buffer entire file in memory

## Manual Validation (via quickstart.md)

- [ ] File opens in Microsoft Excel without errors
- [ ] File opens in Google Sheets without errors
- [ ] File opens in LibreOffice Calc without errors
- [ ] Charts render correctly (not blank)
- [ ] Auto-filter dropdowns work on data worksheets
- [ ] Conditional formatting visible on correlation matrix

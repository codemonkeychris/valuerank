# Tasks: Excel Export with Charts

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, etc.) - only in user story phases
- Include exact file paths from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Create feature branch `feat/024-excel-export`
- [ ] T002 Install `exceljs` dependency in `cloud/apps/api/package.json`
- [ ] T003 Create xlsx service directory `cloud/apps/api/src/services/export/xlsx/`
- [ ] T004 Create xlsx test directory `cloud/apps/api/tests/services/export/xlsx/`

**Checkpoint**: Development environment ready for implementation

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core types and infrastructure that ALL user stories depend on

⚠️ **CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create types file `cloud/apps/api/src/services/export/xlsx/types.ts` with XlsxExportOptions, WorksheetConfig, ChartConfig interfaces
- [ ] T006 [P] Create workbook module `cloud/apps/api/src/services/export/xlsx/workbook.ts` with createWorkbook(), basic worksheet management
- [ ] T007 [P] Create formatting module `cloud/apps/api/src/services/export/xlsx/formatting.ts` with applyTableStyle(), cell formatting utilities
- [ ] T008 Create xlsx index `cloud/apps/api/src/services/export/xlsx/index.ts` re-exporting public API
- [ ] T009 Update `cloud/apps/api/src/services/export/index.ts` to re-export xlsx functions
- [ ] T010 Add route handler skeleton in `cloud/apps/api/src/routes/export.ts` for `/runs/:id/xlsx` endpoint

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 & 2 - Core Export with Charts (Priority: P1) 🎯 MVP

**Goal**: Users can export completed runs to Excel with raw data, model summary, and comparison charts

**Independent Test**: Export a multi-model completed run, verify XLSX opens in Excel with Raw Data worksheet containing all transcripts and Charts worksheet with bar charts

### Implementation for User Stories 1 & 2

#### Raw Data Worksheet (US1)

- [ ] T011 [US1] Create buildRawDataSheet() in `cloud/apps/api/src/services/export/xlsx/worksheets.ts` - headers and column structure
- [ ] T012 [US1] Implement transcript row mapping in worksheets.ts - model name, sample index, dimensions, decision code/text, transcript ID
- [ ] T013 [US1] Add full response column to worksheets.ts with 32,767 char truncation handling
- [ ] T014 [US1] Apply table formatting with auto-filter to Raw Data sheet using formatting.ts

#### Model Summary Worksheet (US1)

- [ ] T015 [US1] Create buildModelSummarySheet() in worksheets.ts - compute per-model statistics
- [ ] T016 [US1] Implement mean score calculation from decision codes in worksheets.ts
- [ ] T017 [US1] Implement standard deviation calculation in worksheets.ts
- [ ] T018 [US1] Apply table formatting to Model Summary sheet

#### Charts (US2)

- [ ] T019 [US2] Create charts module `cloud/apps/api/src/services/export/xlsx/charts.ts` with chart type definitions
- [ ] T020 [US2] Implement addBarChart() in charts.ts for mean scores comparison
- [ ] T021 [US2] Implement addStackedBarChart() in charts.ts for decision distribution
- [ ] T022 [US2] Create buildChartsSheet() in worksheets.ts that places charts with proper sizing
- [ ] T023 [US2] Add axis labels, titles, and legends to chart configurations

#### Export Orchestration (US1)

- [ ] T024 [US1] Create generateExcelExport() main function in `cloud/apps/api/src/services/export/xlsx/index.ts`
- [ ] T025 [US1] Implement run status validation (must be COMPLETED) in generateExcelExport()
- [ ] T026 [US1] Implement transcript query with scenario join in generateExcelExport()
- [ ] T027 [US1] Wire up route handler in `cloud/apps/api/src/routes/export.ts` to call generateExcelExport()
- [ ] T028 [US1] Implement streaming response with proper Content-Type and Content-Disposition headers

#### Unit Tests (US1 & US2)

- [ ] T029 [P] [US1] Create `cloud/apps/api/tests/services/export/xlsx/worksheets.test.ts` - test Raw Data and Model Summary builders
- [ ] T030 [P] [US2] Create `cloud/apps/api/tests/services/export/xlsx/charts.test.ts` - test chart configuration
- [ ] T031 [US1] Create `cloud/apps/api/tests/services/export/xlsx/integration.test.ts` - test full export flow with mocked data

**Checkpoint**: User Stories 1 & 2 complete - users can export runs to Excel with data and charts

---

## Phase 4: User Story 3 - Structured Worksheets (Priority: P2)

**Goal**: Export has well-organized worksheets with auto-filter enabled on all data tables

**Independent Test**: Export a run, verify multiple named worksheets exist with Excel auto-filter available

### Implementation for User Story 3

- [ ] T032 [US3] Ensure worksheet ordering in workbook.ts: Raw Data → Model Summary → Charts → (analysis sheets)
- [ ] T033 [US3] Validate worksheet names ≤ 31 characters in workbook.ts, truncate if needed
- [ ] T034 [US3] Add column width auto-sizing to formatting.ts for better readability
- [ ] T035 [US3] Add header row styling (bold, background color) in formatting.ts
- [ ] T036 [US3] Update worksheets.test.ts with tests for worksheet structure and filtering

**Checkpoint**: User Story 3 complete - worksheets are well-organized and filterable

---

## Phase 5: User Story 4 - Model Agreement Analysis (Priority: P2)

**Goal**: Export includes correlation data, contested scenarios, and dimension impact when available

**Independent Test**: Export a multi-model run with analysis data, verify Model Agreement, Contested Scenarios, and Dimension Impact worksheets are present

### Implementation for User Story 4

#### Model Agreement Worksheet

- [ ] T037 [US4] Create buildModelAgreementSheet() in worksheets.ts - read from AnalysisResult.output
- [ ] T038 [US4] Implement correlation matrix layout in buildModelAgreementSheet()
- [ ] T039 [US4] Apply conditional formatting (color scale) to correlation values using formatting.ts

#### Contested Scenarios Worksheet

- [ ] T040 [US4] Create buildContestedScenariosSheet() in worksheets.ts - top 10 by variance
- [ ] T041 [US4] Add scenario details (ID, name, variance score) to contested sheet

#### Dimension Impact Worksheet

- [ ] T042 [US4] Create buildDimensionImpactSheet() in worksheets.ts - ranked by effect size
- [ ] T043 [US4] Add horizontal bar chart for dimension impact in charts.ts

#### Conditional Generation

- [ ] T044 [US4] Add logic in generateExcelExport() to skip Model Agreement if single model
- [ ] T045 [US4] Add logic to skip analysis sheets if AnalysisResult not available
- [ ] T046 [US4] Add analysis sheet tests to integration.test.ts

**Checkpoint**: User Story 4 complete - analysis worksheets included when data available

---

## Phase 6: User Story 5 - Methods Documentation (Priority: P3)

**Goal**: Export includes a Methods worksheet explaining calculations and any data warnings

**Independent Test**: Export any run, verify Methods worksheet exists with methodology explanation

### Implementation for User Story 5

- [ ] T047 [US5] Create buildMethodsSheet() in worksheets.ts with static methodology text
- [ ] T048 [US5] Add sections for mean score, std dev, correlation calculation explanations
- [ ] T049 [US5] Implement warnings section for data quality issues (low sample size, missing data)
- [ ] T050 [US5] Add Methods sheet generation to generateExcelExport() (always included)
- [ ] T051 [US5] Add Methods sheet test to worksheets.test.ts

**Checkpoint**: User Story 5 complete - documentation included in export

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, error scenarios, and final validation

- [ ] T052 Add error handling for empty runs (no transcripts) - return HTTP 400
- [ ] T053 Add error handling for runs with only failed transcripts
- [ ] T054 Handle special characters and Unicode in model names and decision text
- [ ] T055 Test with large run (500+ transcripts) per SC-001 performance requirement
- [ ] T056 Verify generated XLSX opens in Excel, Google Sheets, and LibreOffice per SC-002
- [ ] T057 Run full test suite and verify 80% coverage per constitution
- [ ] T058 Update export route tests for new xlsx endpoint
- [ ] T059 Manual validation using quickstart.md test scenarios

**Checkpoint**: Feature complete and ready for PR

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundation) ← BLOCKS all user stories
    ↓
Phase 3 (US1 & US2 - P1) ← MVP milestone
    ↓
Phase 4 (US3 - P2) ──┬── Can run in parallel
Phase 5 (US4 - P2) ──┘
    ↓
Phase 6 (US5 - P3)
    ↓
Phase 7 (Polish)
```

### User Story Dependencies

| Story | Priority | Depends On | Can Parallel With |
|-------|----------|------------|-------------------|
| US1 & US2 | P1 | Foundation | - |
| US3 | P2 | US1 & US2 | US4 |
| US4 | P2 | US1 & US2 | US3 |
| US5 | P3 | US1 & US2 | - |

### Parallel Opportunities

- **Phase 2**: T006 and T007 can run in parallel (different files)
- **Phase 3**: T029 and T030 tests can run in parallel
- **Phase 4 & 5**: Entire phases can run in parallel if multiple developers

### MVP Checkpoint

After Phase 3, the feature delivers core value:
- ✅ XLSX export endpoint working
- ✅ Raw Data with all transcript fields including full response
- ✅ Model Summary with statistics
- ✅ Bar charts for model comparison
- ✅ Decision distribution chart

P2 and P3 stories enhance but are not required for initial release.

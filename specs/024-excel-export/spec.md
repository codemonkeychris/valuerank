# Feature Specification: Excel Export with Charts

**Feature Branch:** `feat/024-excel-export`
**Created:** 2026-01-19
**Status:** Draft
**Source:** [GitHub Issue #144](https://github.com/chrislawcodes/valuerank/issues/144)

---

## Input Description

Add the ability to export analysis results in Excel (XLSX) format with multiple worksheets and integrated charts, **in addition to the existing CSV export** (both formats remain available). The current CSV export provides raw transcript data but lacks analytical summaries and visualizations. This feature creates a multi-worksheet XLSX workbook containing raw data, computed statistics, and native Excel charts for visual analysis of model behavior.

---

## User Scenarios & Testing

### User Story 1 - Export Completed Run to Excel (Priority: P1)

As a researcher reviewing completed evaluation runs, I need to export all analysis results to a single Excel file so that I can analyze model behavior offline, share findings with stakeholders who prefer spreadsheets, and create presentations without requiring access to the web application.

**Why this priority**: Core value proposition - enables offline analysis and stakeholder sharing in a widely-used format. Without this, users are limited to CSV (no charts) or must manually recreate visualizations.

**Independent Test**: Complete an evaluation run with multiple models, trigger Excel export, verify the downloaded file opens in Excel and contains transcript data with model statistics.

**Acceptance Scenarios**:

1. **Given** a completed run with analysis results, **When** user requests Excel export, **Then** browser downloads an XLSX file named `valuerank_<run_id>_<date>.xlsx`

2. **Given** a completed run with 3 models and 50 scenarios, **When** user exports to Excel, **Then** the Raw Data worksheet contains 150 rows (3 models × 50 scenarios) with model name, decision code, decision text, dimension values, and complete model response text

3. **Given** an export request for a run in PENDING or RUNNING status, **When** user attempts export, **Then** system returns an error indicating the run must complete before export

---

### User Story 2 - View Model Comparison Charts (Priority: P1)

As a researcher comparing AI model behavior, I need the Excel export to include charts comparing model scores and decision distributions so that I can visually identify patterns and outliers without manually creating visualizations.

**Why this priority**: Visual comparison is the primary differentiator from CSV export and essential for the "richer export format" goal. Charts enable at-a-glance understanding of model differences.

**Independent Test**: Export a completed multi-model run, open in Excel, verify charts render correctly showing model comparisons.

**Acceptance Scenarios**:

1. **Given** a completed run with 3+ models, **When** exported to Excel, **Then** the workbook contains a bar chart comparing mean scores across models

2. **Given** a completed run with decision distribution data, **When** exported to Excel, **Then** the workbook contains a stacked bar chart showing decision code distribution per model (how often each model chose 1, 2, 3, 4, 5)

3. **Given** charts in the exported workbook, **When** viewing in Excel, **Then** charts have readable axis labels, legend, and descriptive title

---

### User Story 3 - Navigate Structured Worksheets (Priority: P2)

As a data analyst, I need the Excel export organized into logical worksheets with filterable tables so that I can quickly navigate to specific analyses and apply Excel's built-in filtering and sorting.

**Why this priority**: Important for usability but the system delivers value with just raw data and charts. Structured worksheets improve the analysis experience for power users.

**Independent Test**: Export a run, verify multiple named worksheets exist, confirm data tables support Excel auto-filter.

**Acceptance Scenarios**:

1. **Given** a completed export, **When** opened in Excel, **Then** workbook contains at minimum these worksheets: Raw Data, Model Summary, Charts

2. **Given** the Raw Data worksheet, **When** clicking on column headers, **Then** Excel filter dropdowns are available for sorting and filtering

3. **Given** the Model Summary worksheet, **When** reviewing content, **Then** each model has a row showing sample count, mean score, and standard deviation

---

### User Story 4 - View Model Agreement Analysis (Priority: P2)

As a researcher studying model consensus, I need the Excel export to show how models agree or disagree across scenarios so that I can identify which scenarios cause the most divergence between models.

**Why this priority**: Valuable for deeper analysis but not required for basic export functionality. Enhances the analytical depth of the export.

**Independent Test**: Export a multi-model run, verify model agreement data is present with correlation metrics.

**Acceptance Scenarios**:

1. **Given** a completed run with 2+ models, **When** exported to Excel, **Then** a Model Agreement worksheet shows correlation between model responses

2. **Given** the Contested Scenarios worksheet, **When** reviewing content, **Then** it lists the top scenarios where models disagreed most (highest variance)

3. **Given** a run with dimension analysis, **When** exported, **Then** a Dimension Impact worksheet ranks which scenario dimensions most influenced model decisions

---

### User Story 5 - Include Methods Documentation (Priority: P3)

As a researcher sharing results with collaborators, I need the Excel export to include a worksheet explaining the statistical methods and any data warnings so that recipients understand how metrics were calculated.

**Why this priority**: Nice-to-have for transparency and reproducibility but not required for core functionality.

**Independent Test**: Export a run, verify a Methods or Documentation worksheet exists with methodology explanation.

**Acceptance Scenarios**:

1. **Given** an exported workbook, **When** viewing the Methods worksheet, **Then** it explains how mean scores, standard deviations, and correlations are calculated

2. **Given** a run with data quality warnings (e.g., low sample size), **When** exported, **Then** the Methods worksheet includes a warnings section noting data limitations

---

## Edge Cases

- **Empty run (no transcripts)**: Return error message indicating nothing to export; do not generate empty workbook
- **Run with only failed/error transcripts**: Export Raw Data showing error states; charts may show "No valid data" or be omitted
- **Single model run**: Charts render with single bar; Model Agreement worksheet shows N/A or is omitted
- **Very large run (1000+ scenarios)**: Export should complete; may take longer but should not timeout
- **Missing analysis results**: Export Raw Data and basic Model Summary from transcripts; skip analysis-dependent worksheets with note in Methods
- **Special characters in model names**: Properly escape for Excel cell values and chart labels
- **Unicode in decision text**: Ensure UTF-8 encoding throughout workbook
- **Worksheet name length**: Excel limits worksheet names to 31 characters; truncate appropriately
- **Run with multi-sample data**: Include sample index in Raw Data; aggregate appropriately in summaries
- **Very long model responses**: Excel cells support up to 32,767 characters; responses exceeding this limit should be truncated with "[TRUNCATED]" indicator

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST generate a valid XLSX file that opens without errors in Microsoft Excel 2016+, Google Sheets, and LibreOffice Calc 7+
- **FR-002**: System MUST include a Raw Data worksheet containing all transcript records with columns: Model Name, Sample Index, [Dimension columns], Decision Code, Decision Text, Transcript ID, Full Response (complete model output text)
- **FR-003**: System MUST include a Model Summary worksheet with per-model statistics: sample count, mean decision score, standard deviation
- **FR-004**: System MUST include at least one chart visualizing model comparison (bar chart of mean scores or decision distribution)
- **FR-005**: System MUST apply Excel table formatting with auto-filter headers to data worksheets
- **FR-006**: System MUST include the complete model response text for each transcript in the Raw Data worksheet, ensuring users have access to all underlying data without needing the web application
- **FR-007**: System MUST return HTTP 400 error with descriptive message when export requested for non-COMPLETED runs
- **FR-008**: System SHOULD include a Decision Distribution chart showing stacked bars of decision code frequency per model
- **FR-009**: System SHOULD include a Model Agreement worksheet with correlation data when run has 2+ models
- **FR-010**: System SHOULD include a Contested Scenarios worksheet listing top 10 highest-variance scenarios
- **FR-011**: System SHOULD include a Dimension Impact worksheet showing ranked dimensions by effect size when analysis data is available
- **FR-012**: System MAY include a Methods worksheet documenting calculation methodology and any data warnings
- **FR-013**: System MUST use conditional formatting (color scales) for correlation matrices and heatmap-style data

---

## Success Criteria

- **SC-001**: Users can download Excel export for any completed run within 15 seconds for runs with up to 500 transcripts
- **SC-002**: Downloaded files open without errors or warnings in Excel, Google Sheets, and LibreOffice
- **SC-003**: Charts render correctly with visible data (not blank or showing errors) for runs with valid transcript data
- **SC-004**: Users report Excel export is more useful than CSV for sharing results with stakeholders (qualitative validation)

---

## Key Entities

### ExcelWorkbook
- runId: string (source run)
- worksheets: ExcelWorksheet[] (ordered list)
- generatedAt: timestamp

### ExcelWorksheet
- name: string (max 31 chars)
- type: 'data' | 'summary' | 'chart' | 'documentation'
- dataTable: row/column data (if data type)
- charts: ChartDefinition[] (if chart type)

### ChartDefinition
- type: 'clustered_bar' | 'stacked_bar' | 'heatmap'
- title: string
- dataRange: cell reference range
- axisLabels: { x: string, y: string }

---

## Assumptions

1. **Additive feature**: This adds XLSX export alongside existing CSV export; both formats will remain available and supported
2. **Library choice**: Implementation will use `exceljs` npm package as suggested in the issue - it supports native Excel charts, formatting, and streaming writes
3. **Export trigger**: Export will be available via API endpoint (for programmatic access); web UI button is out of scope for this feature
4. **File delivery**: File returned as binary download stream, not stored permanently on server
5. **Chart types**: Using Excel's native chart types rather than embedded images for editability
6. **Worksheet count**: Starting with 5-7 worksheets (Raw Data, Model Summary, Charts, Agreement, Contested, Dimensions, Methods); can expand based on feedback
7. **No real-time updates**: Export is point-in-time snapshot; subsequent run changes not reflected
8. **Authentication**: Export endpoint requires same authentication as existing CSV export

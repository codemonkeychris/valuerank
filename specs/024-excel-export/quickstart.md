# Quickstart: Excel Export with Charts

Manual testing guide for the Excel export feature.

---

## Prerequisites

- [ ] Development environment running (`npm run dev` in cloud/)
- [ ] PostgreSQL database running with test data
- [ ] At least one **completed** run with multiple models (2+ models preferred)
- [ ] Microsoft Excel, Google Sheets, or LibreOffice Calc installed for verification

### Quick Setup (if no test data exists)

```bash
# From cloud/ directory
npm run dev

# In another terminal, seed the database
DATABASE_URL="postgresql://valuerank:valuerank@localhost:5433/valuerank" \
  npx prisma db seed --schema packages/db/prisma/schema.prisma
```

---

## Testing User Story 1: Export Completed Run to Excel

**Goal**: Verify users can download an Excel file for a completed run

### Steps

1. Get a valid JWT token:
   ```bash
   TOKEN=$(node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({sub:'cmixy5vz90000l8tv2t6ar0vc',email:'dev@valuerank.ai'},'dev-secret-key-for-local-development-only-32chars',{expiresIn:'1h'}))")
   ```

2. Find a completed run ID:
   ```bash
   curl -s -X POST http://localhost:3031/graphql \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"query": "query { runs(limit: 5, status: completed) { id status } }"}' | jq
   ```

3. Export the run to Excel:
   ```bash
   RUN_ID="<paste-run-id-here>"
   curl -s -o "test_export.xlsx" \
     -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3031/api/export/runs/$RUN_ID/xlsx"
   ```

4. Open `test_export.xlsx` in Excel/Sheets

### Expected Results

- [ ] File downloads without error
- [ ] Filename format: `valuerank_<8-char-id>_<date>.xlsx`
- [ ] File opens in Excel without errors or warnings
- [ ] Raw Data worksheet contains rows for all transcripts
- [ ] Each row has: Model Name, Sample Index, Dimension columns, Decision Code, Decision Text, Transcript ID, Full Response

### Verification Queries

```bash
# Check transcript count matches
curl -s -X POST http://localhost:3031/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\": \"query { run(id: \\\"$RUN_ID\\\") { transcripts { id } } }\"}" | jq '.data.run.transcripts | length'
```

---

## Testing User Story 2: View Model Comparison Charts

**Goal**: Verify Excel export includes readable comparison charts

### Steps

1. Export a completed run with 3+ models (use steps from US1)

2. Open the exported file in Excel

3. Navigate to the "Charts" worksheet

4. Verify chart visibility and data

### Expected Results

- [ ] Charts worksheet exists in workbook
- [ ] Bar chart showing mean scores per model is visible
- [ ] Chart has title describing the data
- [ ] Chart has axis labels (X: Model names, Y: Score)
- [ ] Chart has legend if multiple data series
- [ ] Stacked bar chart shows decision distribution (if data available)

### Manual Chart Verification

In Excel:
1. Click on chart to select it
2. Verify data range references Model Summary data
3. Hover over bars to confirm values match Model Summary worksheet

---

## Testing User Story 3: Navigate Structured Worksheets

**Goal**: Verify worksheets are organized and filterable

### Steps

1. Open an exported Excel file

2. Check worksheet tabs at bottom of Excel window

3. Navigate to "Raw Data" worksheet

4. Click on a column header (e.g., "Model Name")

5. Check for filter dropdown arrow

### Expected Results

- [ ] Multiple worksheet tabs visible: Raw Data, Model Summary, Charts (minimum)
- [ ] Additional tabs if analysis data exists: Model Agreement, Contested Scenarios, Dimension Impact
- [ ] Raw Data worksheet has auto-filter enabled (dropdown arrows on headers)
- [ ] Model Summary worksheet shows per-model statistics table
- [ ] Can sort/filter data using Excel's built-in tools

### Filter Test

1. In Raw Data, click filter dropdown on "Model Name" column
2. Uncheck all except one model
3. Verify only that model's rows are visible
4. Clear filter and verify all rows return

---

## Testing User Story 4: View Model Agreement Analysis

**Goal**: Verify correlation data and contested scenarios are included

### Prerequisites

- Run must have 2+ models
- Run must have completed analysis (check `analysisResults` in GraphQL)

### Steps

1. Export a multi-model completed run

2. Navigate to "Model Agreement" worksheet (if present)

3. Check for correlation matrix with conditional formatting

4. Navigate to "Contested Scenarios" worksheet (if present)

### Expected Results

- [ ] Model Agreement worksheet shows correlation values between models
- [ ] Values are formatted with color scale (red-yellow-green heatmap)
- [ ] Contested Scenarios lists top scenarios by variance
- [ ] Dimension Impact shows ranked dimensions (if analysis available)

### Verification

```bash
# Check if run has analysis data
curl -s -X POST http://localhost:3031/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query\": \"query { run(id: \\\"$RUN_ID\\\") { analysisResults { id analysisType status } } }\"}" | jq
```

---

## Testing User Story 5: Include Methods Documentation

**Goal**: Verify methodology documentation is included

### Steps

1. Export any completed run

2. Navigate to "Methods" worksheet (if present)

3. Review content

### Expected Results

- [ ] Methods worksheet exists
- [ ] Explains how mean scores are calculated
- [ ] Explains how standard deviation is computed
- [ ] If data quality issues exist, warnings section is present

---

## Testing Edge Cases

### Edge Case: Non-Completed Run

```bash
# Try to export a RUNNING or PENDING run
curl -s -w "\nHTTP Status: %{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3031/api/export/runs/non-completed-run-id/xlsx"
```

**Expected**: HTTP 400 with error message about run status

### Edge Case: Non-Existent Run

```bash
curl -s -w "\nHTTP Status: %{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3031/api/export/runs/fake-run-id-12345/xlsx"
```

**Expected**: HTTP 404 with "Run not found" message

### Edge Case: Unauthenticated Request

```bash
curl -s -w "\nHTTP Status: %{http_code}" \
  "http://localhost:3031/api/export/runs/$RUN_ID/xlsx"
```

**Expected**: HTTP 401 with authentication error

### Edge Case: Single Model Run

1. Create or find a run with only 1 model
2. Export to Excel
3. Verify:
   - [ ] Charts render with single bar
   - [ ] Model Agreement worksheet is omitted or shows N/A

### Edge Case: Very Long Model Response

1. Find a transcript with response > 1000 characters
2. Export the run
3. In Raw Data, check the Full Response column
4. Verify:
   - [ ] Full response text is present
   - [ ] If > 32,767 chars, text ends with "[TRUNCATED]"

---

## Troubleshooting

### Issue: File won't open in Excel

**Possible Causes**:
- Malformed XLSX structure
- Binary response corrupted

**Debug Steps**:
1. Check file size (should be > 0 bytes)
2. Try opening in Google Sheets or LibreOffice
3. Check server logs for export errors

### Issue: Charts are blank

**Possible Causes**:
- Data range references invalid
- No valid transcript data

**Debug Steps**:
1. Check Model Summary worksheet has data
2. Verify chart data range in Excel (click chart, check formula bar)
3. Check server logs for chart generation errors

### Issue: Missing worksheets

**Possible Causes**:
- No analysis data for run
- Single model run (Model Agreement omitted)

**Debug Steps**:
1. Query run's analysis results via GraphQL
2. Check number of models in run config
3. Verify transcript decision codes are populated

### Issue: Export timeout

**Possible Causes**:
- Very large run (1000+ transcripts)
- Database query slow

**Debug Steps**:
1. Check transcript count before export
2. Monitor server memory during export
3. Check database query performance

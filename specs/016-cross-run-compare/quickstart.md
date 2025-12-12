# Quickstart: Cross-Run Comparison

## Prerequisites

- [ ] Development environment running (`npm run dev` in cloud/)
- [ ] PostgreSQL database running with test data
- [ ] At least 2-3 completed runs with analysis (ideally with overlapping models)
- [ ] Logged in as dev@valuerank.ai

## Quick Setup

If you need test runs for comparison:

```bash
# Navigate to cloud directory
cd cloud

# Start dev environment
npm run dev

# In another terminal, seed some test data if needed
DATABASE_URL="postgresql://valuerank:valuerank@localhost:5433/valuerank" \
  npx prisma db seed --schema packages/db/prisma/schema.prisma
```

---

## Testing User Story 1: Select Runs for Comparison

**Goal**: Verify run selection works with URL state persistence

**Steps**:
1. Navigate to http://localhost:3030/compare
2. Observe the run selector showing available runs with analysis
3. Click on a run to select it (should show visual selection indicator)
4. Click on a second run to add it to comparison
5. Check the URL - should show `?runs=id1,id2`
6. Copy the URL and open in a new browser tab

**Expected**:
- Run selector displays runs with: name, definition, model count, date, sample size
- Selected runs show checkmark or highlight
- URL updates immediately when selection changes
- New tab loads with same runs pre-selected
- Warning appears if selected run has no completed analysis

**Verification**:
```
URL should look like: /compare?runs=cmxxx,cmyyy
Both runs should be visually selected
```

---

## Testing User Story 2: View Aggregate Comparison Overview

**Goal**: Verify overview displays comparative statistics across runs

**Steps**:
1. Select 2+ runs with completed analysis
2. Verify Overview visualization is shown by default (or click "Overview" tab)
3. Examine the summary table

**Expected**:
- Each run shows: name, definition name, models used, sample size, mean decision
- Common models are highlighted
- Unique models per run are indicated
- Effect sizes (Cohen's d) shown for key metrics
- Hover reveals additional metadata (dates, warnings)

**Verification**:
```
Check that mean values match individual run analyses
Verify effect size interpretation (negligible/small/medium/large)
```

---

## Testing User Story 3: Compare Decision Distributions

**Goal**: Verify decision distribution comparison visualization

**Steps**:
1. With 2+ runs selected, click "Decisions" tab
2. Observe the distribution chart (histogram or bar chart)
3. Toggle between "Overlay" and "Side-by-side" modes
4. If multiple models exist, try filtering to a single model

**Expected**:
- Distributions from all runs visible in same view
- Overlay mode: Multiple histograms on same axes, distinguished by color
- Side-by-side mode: Small multiples, one chart per run
- KS statistic displayed showing distribution difference
- Model filter updates all charts

**Verification**:
```
Overlay: All runs visible with legend
Side-by-side: One chart per run, aligned scales
Filter: Charts update to show only filtered model
```

---

## Testing User Story 4: Compare Value Prioritization Patterns

**Goal**: Verify value win rate comparison visualization

**Steps**:
1. With 2+ runs selected, click "Values" tab
2. Observe the grouped bar chart showing win rates
3. Look for highlighted values (significant changes)
4. Click on a specific value for details

**Expected**:
- Grouped bar chart: each value has bars for each run
- Values with significant changes visually highlighted
- Clicking a value shows confidence intervals and sample sizes
- Model filter allows focusing on single model's value shifts

**Verification**:
```
Win rates should match individual run analysis values
Significant changes (>10% difference) should be highlighted
```

---

## Testing User Story 5: URL-Based State for Sharing

**Goal**: Verify complete comparison state is captured in URL

**Steps**:
1. Select 3 runs
2. Switch to "Values" visualization
3. Filter to a specific model (e.g., "openai:gpt-4o")
4. Copy the full URL
5. Open in new browser/incognito window
6. Use browser back/forward buttons

**Expected**:
- URL contains: `?runs=id1,id2,id3&viz=values&model=openai:gpt-4o`
- New window shows identical view
- Back button returns to previous state
- Forward button restores changed state

**Verification**:
```
Full URL example: /compare?runs=cm1,cm2,cm3&viz=values&model=openai:gpt-4o
State should be identical in new window
```

---

## Testing User Story 6: Extensible Visualization System

**Goal**: Verify visualization registry architecture (developer test)

**Steps**:
1. Open `src/components/compare/visualizations/registry.ts`
2. Verify visualizations are registered with: id, label, icon, component, minRuns
3. Verify all 4 visualizations appear in the UI tabs

**Expected**:
- Registry exports `visualizationRegistry` object
- Each entry has required fields
- UI tabs match registry entries
- Disabled visualizations (if minRuns not met) show tooltip explanation

**Verification**:
```typescript
// Registry should have 4 entries
Object.keys(visualizationRegistry).length === 4
// Each entry has required fields
Object.values(visualizationRegistry).every(v =>
  v.id && v.label && v.icon && v.component && v.minRuns >= 1
)
```

---

## Testing User Story 7: Model Version Tracking Comparison

**Goal**: Verify timeline visualization for model drift detection

**Steps**:
1. Select 3+ runs that include the same model (e.g., gpt-4o)
2. Click "Timeline" tab
3. Observe the line chart
4. Filter to a single model
5. Hover over data points

**Expected**:
- X-axis: Run completion dates
- Y-axis: Mean decision (or other selected metric)
- Line connects points for each model
- Filter shows only selected model's line
- Tooltip shows: run name, exact value, link to analysis

**Verification**:
```
Points should be ordered by completedAt date
Values should match individual run analysis
```

---

## Testing Edge Cases

### No Analysis Available
1. Select a run with status "pending" or "failed"
2. **Expected**: Warning message, but selection allowed

### Only One Run Selected
1. Select only one run
2. **Expected**: Single-run summary shown, prompt to add more

### Invalid URL Parameters
1. Navigate to `/compare?runs=invalid-id`
2. **Expected**: Warning shown, invalid IDs ignored

### Too Many Runs
1. Try to select more than 10 runs
2. **Expected**: Selection blocked at 10 with explanation

---

## Troubleshooting

**Issue**: No runs appear in selector
**Fix**: Ensure runs have completed analysis
```bash
# Check run status in database
DATABASE_URL="postgresql://valuerank:valuerank@localhost:5433/valuerank" \
  npx prisma studio
# Navigate to Run table, check analysisStatus = 'completed'
```

**Issue**: Charts not rendering
**Fix**: Check browser console for errors
- Ensure Recharts is properly imported
- Check that analysis data structure matches expected types

**Issue**: URL state not updating
**Fix**: Verify react-router-dom is properly configured
- Check App.tsx has route for /compare
- Ensure useSearchParams is from 'react-router-dom'

**Issue**: Compare tab not appearing
**Fix**: Check NavTabs.tsx was updated
```tsx
// NavTabs.tsx should include:
{ name: 'Compare', path: '/compare', icon: GitCompare }
```

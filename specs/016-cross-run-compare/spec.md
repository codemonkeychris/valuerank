# Feature Specification: Cross-Run Comparison

> **Feature #016** | Branch: `feature/cross-run-compare`
> **Created**: 2025-12-12
> **Status**: Draft
> **Dependencies**: Stage 11 (Analysis System) - Complete

## Overview

Add a dedicated **Compare** tab that enables researchers to compare analysis results across multiple runs. This complements the existing Analysis tab which compares models *within* a single run. The Compare tab focuses on comparing *across* runs to answer questions like:

- **A/B Testing**: Did changing the scenario wording affect model behavior?
- **Model Evolution**: How has GPT-4o's behavior changed across versions (turbo, preview, latest)?
- **Process Changes**: Does adding a preamble instruction shift value prioritization?
- **Definition Refinement**: Does version 2 of our dilemma produce cleaner separation?

**Key Principle**: Focus on comparing process/definition/model version changes rather than model-to-model comparison (which the existing Analysis tab handles well).

**Input Description**: "Compare" tab in navigation, run selection interface, URL-based state for shareable links, extensible visualization system, aggregate statistics comparison, value drift detection, decision distribution deltas.

---

## User Stories & Testing

### User Story 1 - Select Runs for Comparison (Priority: P1)

As a researcher, I need to select multiple runs to compare so that I can analyze how changes in definitions, models, or process affect AI behavior.

**Why this priority**: Core functionality - without run selection, no comparison is possible. This is the foundation of the entire feature.

**Independent Test**: Navigate to Compare tab, select 2+ runs from a list, verify selected runs appear in the comparison context.

**Acceptance Scenarios**:

1. **Given** I navigate to the Compare tab, **When** the page loads, **Then** I see a run selector interface showing available runs
2. **Given** I view the run selector, **When** I browse runs, **Then** I can see run name/definition, date, model count, and analysis status
3. **Given** runs are listed, **When** I click on a run, **Then** it is added to my comparison set (visually indicated)
4. **Given** I have selected runs, **When** I want to remove one, **Then** I can click to deselect it
5. **Given** I select runs, **When** I view the URL, **Then** the selected run IDs are encoded in the URL (e.g., `/compare?runs=id1,id2,id3`)
6. **Given** a URL with run IDs, **When** I navigate to it directly, **Then** those runs are pre-selected
7. **Given** I select runs, **When** any selected run lacks completed analysis, **Then** I see a warning that comparison may be limited

---

### User Story 2 - View Aggregate Comparison Overview (Priority: P1)

As a researcher, I need to see a high-level overview comparing aggregate statistics across selected runs so that I can quickly identify meaningful differences.

**Why this priority**: Core functionality - the overview provides immediate value and orientation before diving into specific visualizations.

**Independent Test**: Select 2+ runs with completed analysis, verify overview shows comparative statistics including mean scores, sample sizes, and key differences.

**Acceptance Scenarios**:

1. **Given** I have selected 2+ runs, **When** I view the comparison, **Then** I see a summary table showing each run's aggregate statistics
2. **Given** the overview is displayed, **When** I examine it, **Then** I see: run name, definition name, models used, sample size, overall mean decision
3. **Given** runs have different definitions, **When** I view the overview, **Then** definition differences are highlighted
4. **Given** runs have overlapping models, **When** I view the overview, **Then** I see which models are common vs. unique to each run
5. **Given** statistical differences exist, **When** I view the overview, **Then** I see effect sizes (Cohen's d) for key metrics between runs
6. **Given** the overview is shown, **When** I hover over a run, **Then** I see additional metadata (created date, completion date, warnings)

---

### User Story 3 - Compare Decision Distributions (Priority: P1)

As a researcher, I need to compare how decision distributions differ across runs so that I can see if process/definition changes shift AI responses toward different choices.

**Why this priority**: Core functionality - decision distribution is the primary output we're measuring. Comparing distributions directly answers "did the change work?"

**Independent Test**: Select 2 runs with different definitions, view decision distribution visualization, verify side-by-side or overlaid distribution comparison.

**Acceptance Scenarios**:

1. **Given** I have selected runs for comparison, **When** I select the Decision Distribution visualization, **Then** I see distributions from all selected runs
2. **Given** distributions are displayed, **When** I examine them, **Then** I can see them overlaid (same chart) or side-by-side (small multiples)
3. **Given** multiple models exist per run, **When** I view distributions, **Then** I can aggregate by run (all models combined) or filter to specific model
4. **Given** distributions are shown, **When** I compare visually, **Then** differences in central tendency and spread are apparent
5. **Given** the visualization is displayed, **When** I check statistics, **Then** I see Kolmogorov-Smirnov test results for distribution difference
6. **Given** I toggle display mode, **When** I switch between overlay and side-by-side, **Then** the visualization updates accordingly

---

### User Story 4 - Compare Value Prioritization Patterns (Priority: P1)

As a researcher, I need to compare how value win rates differ across runs so that I can see if changes affected which values AI models prioritize.

**Why this priority**: Core functionality - value prioritization is the key behavioral metric. Detecting shifts in value weighting answers whether interventions changed AI reasoning.

**Independent Test**: Select 2 runs, view value comparison visualization, verify win rates for each value are compared across runs.

**Acceptance Scenarios**:

1. **Given** I have selected runs, **When** I select the Value Comparison visualization, **Then** I see win rates for each value across runs
2. **Given** value comparison is displayed, **When** I examine it, **Then** I see a grouped bar chart or parallel coordinates showing each value's win rate per run
3. **Given** values are compared, **When** I look for changes, **Then** values with significant win rate changes are highlighted
4. **Given** I want detail, **When** I click on a value, **Then** I see confidence intervals and sample sizes for that value across runs
5. **Given** runs use the same model, **When** I compare a single model's values, **Then** I can isolate that model's value shifts
6. **Given** the visualization shows changes, **When** I examine significance, **Then** I see whether changes exceed confidence interval overlap

---

### User Story 5 - URL-Based State for Sharing (Priority: P1)

As a researcher, I need the comparison configuration to be captured in the URL so that I can share a specific comparison view with colleagues.

**Why this priority**: Core functionality - shareable links are essential for collaboration and reproducing insights. The user explicitly requested this capability.

**Independent Test**: Configure a comparison (select runs, choose visualization), copy URL, open in new browser, verify identical state is restored.

**Acceptance Scenarios**:

1. **Given** I select runs, **When** I check the URL, **Then** run IDs are encoded as query parameters
2. **Given** I select a visualization, **When** I check the URL, **Then** the visualization type is in the URL (e.g., `?viz=decisions`)
3. **Given** I apply filters, **When** I check the URL, **Then** filter state is encoded (e.g., `?model=gpt-4o`)
4. **Given** I have a complete comparison URL, **When** I share it with a colleague, **Then** they see the exact same view
5. **Given** URL parameters reference non-existent runs, **When** the page loads, **Then** invalid runs are ignored with a warning
6. **Given** the URL changes via user interaction, **When** I use browser back/forward, **Then** history navigation works correctly

---

### User Story 6 - Extensible Visualization System (Priority: P2)

As a developer, I need the visualization system to be extensible so that new comparison visualizations can be added without restructuring the component architecture.

**Why this priority**: Important for maintainability - the user noted wanting to "try multiple visualizations" and this architecture supports iteration.

**Independent Test**: Add a new visualization type by creating a component file and registering it, verify it appears in the visualization selector.

**Acceptance Scenarios**:

1. **Given** the architecture is implemented, **When** I examine the code, **Then** visualizations are registered in a central registry
2. **Given** I want to add a new visualization, **When** I create a component matching the interface, **Then** I register it and it appears in UI
3. **Given** visualizations are registered, **When** they render, **Then** they receive standardized comparison data props
4. **Given** a visualization needs specific data, **When** it renders, **Then** it can access all selected runs' analysis results
5. **Given** the registry exists, **When** a visualization is registered, **Then** it specifies: id, label, icon, component, minimum run count
6. **Given** visualizations have requirements, **When** requirements aren't met, **Then** the visualization is disabled with explanation

---

### User Story 7 - Model Version Tracking Comparison (Priority: P2)

As a researcher, I need to compare the same model across different runs over time so that I can detect behavioral drift as models are updated.

**Why this priority**: Important for the "model evolution" use case - tracking how GPT-4o, Claude, etc. change over time is a key research question.

**Independent Test**: Select 3+ runs with the same model (e.g., gpt-4o), view a timeline visualization showing behavioral metrics over time.

**Acceptance Scenarios**:

1. **Given** I select runs with overlapping models, **When** I view the Model Timeline visualization, **Then** I see a line chart of metrics over run dates
2. **Given** the timeline shows metrics, **When** I examine it, **Then** I see mean decision, standard deviation, and key value win rates
3. **Given** multiple models are present, **When** I view the timeline, **Then** I can filter to a single model for cleaner comparison
4. **Given** behavioral drift occurs, **When** I view the timeline, **Then** I see trend lines and can identify when drift occurred
5. **Given** runs span time periods, **When** I view the X-axis, **Then** runs are positioned by their completion date
6. **Given** I hover over a point, **When** the tooltip appears, **Then** I see run details, exact values, and link to that run's analysis

---

### User Story 8 - Scenario-Level Delta Analysis (Priority: P2)

As a researcher, I need to compare how individual scenarios produced different responses across runs so that I can identify which specific scenarios were most affected by changes.

**Why this priority**: Important for deep analysis - knowing *which* scenarios changed most helps understand the mechanism of definition/process effects.

**Independent Test**: Select 2 runs with overlapping scenarios, view scenario delta visualization, verify scenarios are ranked by response change.

**Acceptance Scenarios**:

1. **Given** I select runs with overlapping scenarios, **When** I view Scenario Deltas, **Then** I see scenarios ranked by cross-run variance
2. **Given** scenario deltas are shown, **When** I examine them, **Then** I see the mean decision difference per scenario
3. **Given** a scenario shows high delta, **When** I click it, **Then** I see the specific response breakdown for that scenario in each run
4. **Given** scenarios are listed, **When** I filter by dimension value, **Then** I can see if certain dimension levels drove change
5. **Given** runs have non-overlapping scenarios, **When** I view deltas, **Then** only overlapping scenarios are compared (with count displayed)
6. **Given** I identify an interesting scenario, **When** I click to drill down, **Then** I can navigate to view transcripts from each run

---

### User Story 9 - Definition Diff View (Priority: P3)

As a researcher, I need to see the differences between definitions used in compared runs so that I understand what changed between versions.

**Why this priority**: Nice to have - helps contextualize comparison results but researchers can manually compare definitions if needed.

**Independent Test**: Select 2 runs with different definition versions, view definition diff, verify text differences are highlighted.

**Acceptance Scenarios**:

1. **Given** I compare runs with different definitions, **When** I view Definition Diff, **Then** I see the template text side-by-side
2. **Given** definitions differ, **When** I examine the diff, **Then** added/removed/changed text is highlighted
3. **Given** definitions have the same template but different dimensions, **When** I view diff, **Then** dimension changes are shown
4. **Given** runs use the same definition, **When** I view Definition Diff, **Then** I see "Definitions identical"
5. **Given** I want to understand context, **When** I view the diff, **Then** I can expand to see full preamble and template
6. **Given** runs have forked definitions, **When** I view the diff, **Then** the parent-child relationship is indicated

---

### User Story 10 - Export Comparison Report (Priority: P3)

As a researcher, I need to export a comparison report so that I can include results in papers or share with stakeholders who don't have system access.

**Why this priority**: Nice to have - useful for external sharing but not blocking for core comparison functionality.

**Independent Test**: Configure a comparison, click export, verify a formatted report (PDF or HTML) is generated with selected visualizations.

**Acceptance Scenarios**:

1. **Given** I have a comparison configured, **When** I click Export, **Then** I see options for export format (PDF, HTML, JSON)
2. **Given** I select PDF export, **When** export completes, **Then** I receive a formatted document with charts and statistics
3. **Given** the export generates, **When** I examine it, **Then** it includes methodology notes and data provenance
4. **Given** I select JSON export, **When** export completes, **Then** I receive raw comparison data for further analysis
5. **Given** visualizations are complex, **When** I export, **Then** static image captures are included (not interactive)
6. **Given** I share an exported report, **When** recipients view it, **Then** they see clear attribution and link back to system

---

## Edge Cases

### Run Selection Edge Cases
- **No completed analysis**: Warn user, allow selection but note limited comparison
- **Only one run selected**: Show single-run summary, prompt to add more for comparison
- **More than 10 runs**: Support with scrollable UI, but warn about visual complexity
- **Runs from different users**: If multi-tenant, only show user's own runs (future consideration)
- **Deleted runs in URL**: Handle gracefully, show warning, load remaining valid runs

### Data Compatibility Edge Cases
- **Different definitions with no overlapping scenarios**: Show aggregate-only comparison, note scenario mismatch
- **Different value rubrics**: Flag incompatibility, allow only metrics that align
- **Runs with zero transcripts**: Exclude from statistical comparison with explanation
- **Partial overlap in models**: Clearly indicate which models are common vs. unique
- **Missing analysis data**: Some fields null - handle gracefully per visualization

### Visualization Edge Cases
- **All runs have identical results**: Show but note "no significant differences detected"
- **Extreme outlier runs**: Handle scale appropriately, consider outlier detection
- **Very different sample sizes**: Show warnings, adjust confidence intervals
- **Statistical tests fail**: Display "insufficient data" rather than misleading results

### URL State Edge Cases
- **URL too long (>2000 chars)**: Use compressed encoding or hash-based lookup
- **Invalid visualization ID in URL**: Fall back to default (overview)
- **Conflicting parameters**: Prefer most recent/specific, ignore invalid

---

## Functional Requirements

### Navigation & Routing
- **FR-001**: System MUST add a "Compare" tab to the main navigation between "Analysis" and "Experiments"
- **FR-002**: System MUST route `/compare` to the Compare page
- **FR-003**: System MUST support URL parameters for state: `runs`, `viz`, `model`, `value`
- **FR-004**: System MUST update URL when comparison state changes without full page reload

### Run Selection
- **FR-005**: System MUST display available runs with analysis status in a selectable list
- **FR-006**: System MUST allow selecting 2-10 runs for comparison
- **FR-007**: System MUST persist selected runs in URL as comma-separated IDs
- **FR-008**: System MUST show run metadata: name, definition, models, date, sample size
- **FR-009**: System MUST filter runs to those with completed or computing analysis

### Visualization Registry
- **FR-010**: System MUST implement a visualization registry pattern for extensibility
- **FR-011**: System MUST provide at least 4 initial visualizations: Overview, Decisions, Values, Timeline
- **FR-012**: System MUST pass standardized props to all visualizations: `runs`, `analysisResults`, `filters`
- **FR-013**: System MUST support visualization-specific filter controls
- **FR-014**: System MUST encode active visualization in URL (`viz` parameter)

### Aggregate Comparison
- **FR-015**: System MUST compute and display aggregate statistics per run
- **FR-016**: System MUST calculate effect sizes (Cohen's d) between runs for key metrics
- **FR-017**: System MUST identify and highlight statistically significant differences
- **FR-018**: System MUST show common vs. unique models across runs

### Decision Distribution Comparison
- **FR-019**: System MUST display decision distributions from multiple runs in single view
- **FR-020**: System MUST support overlay mode (same chart) and side-by-side mode
- **FR-021**: System MUST compute Kolmogorov-Smirnov test for distribution differences
- **FR-022**: System MUST allow filtering to specific model or aggregating across models

### Value Comparison
- **FR-023**: System MUST display win rates for each value across selected runs
- **FR-024**: System MUST highlight values with significant win rate changes
- **FR-025**: System MUST show confidence intervals for win rate comparisons
- **FR-026**: System MUST support filtering to a specific model for value comparison

### Timeline Comparison
- **FR-027**: System MUST plot metrics over run completion dates for shared models
- **FR-028**: System MUST show trend lines for detecting behavioral drift
- **FR-029**: System MUST support metric selection: mean decision, std dev, value win rates
- **FR-030**: System MUST link timeline points to individual run analysis

---

## Success Criteria

- **SC-001**: Users can share a comparison URL and recipient sees identical view within 2 seconds of page load
- **SC-002**: Adding a new visualization type requires only creating a component and registry entry (< 50 lines boilerplate)
- **SC-003**: Comparison visualizations render in under 3 seconds for typical usage (2-5 runs, ~500 transcripts each)
- **SC-004**: Statistical comparisons (effect sizes, distribution tests) computed correctly (verified by unit tests)
- **SC-005**: 80% code coverage on new comparison components and services (per constitution)
- **SC-006**: All new files under 400 lines (per constitution)
- **SC-007**: No `any` types in TypeScript code (per constitution)
- **SC-008**: Compare tab appears in navigation and routes correctly
- **SC-009**: URL state survives page refresh and browser back/forward navigation

---

## Key Entities

### ComparisonConfig (client-side state)
```typescript
type ComparisonConfig = {
  runIds: string[];                    // Selected run IDs
  visualization: VisualizationType;    // Active visualization
  filters: {
    model?: string;                    // Filter to specific model
    value?: string;                    // Filter to specific value
    displayMode?: 'overlay' | 'side-by-side';
  };
};
```

### VisualizationRegistration
```typescript
type VisualizationRegistration = {
  id: string;                          // Unique identifier (e.g., 'decisions')
  label: string;                       // Display name
  icon: LucideIcon;                    // Icon component
  component: React.ComponentType<ComparisonVisualizationProps>;
  minRuns: number;                     // Minimum runs required (usually 2)
  description: string;                 // Help text
};

type ComparisonVisualizationProps = {
  runs: RunWithAnalysis[];             // Selected runs with their analysis
  filters: ComparisonFilters;          // Current filter state
  onFilterChange: (filters: ComparisonFilters) => void;
};
```

### RunWithAnalysis (extended for comparison)
```typescript
type RunWithAnalysis = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  definition: {
    id: string;
    name: string;
    preamble: string;
    template: string;
  };
  models: string[];
  sampleSize: number;
  analysis: AnalysisResult | null;
};
```

### ComparisonStatistics (computed)
```typescript
type ComparisonStatistics = {
  runPairs: {
    run1Id: string;
    run2Id: string;
    meanDifference: number;
    effectSize: number;                // Cohen's d
    ksStatistic?: number;              // Kolmogorov-Smirnov for distributions
    ksPValue?: number;
    significantValueChanges: string[]; // Values with significant win rate shifts
  }[];
  commonModels: string[];
  uniqueModels: Record<string, string[]>; // runId -> unique models
};
```

---

## Assumptions

1. **Analysis data available**: Runs to be compared have completed analysis (or can compute on-demand)
2. **Analysis schema stable**: The AnalysisResult structure from Stage 11 is stable and sufficient
3. **GraphQL supports multiple runs**: Can query multiple runs' analysis in single request
4. **Recharts sufficient**: Existing Recharts library can handle comparison visualizations
5. **Client-side comparison**: Statistical comparisons computed in browser (not backend)
6. **URL length acceptable**: Typical comparisons (2-5 runs) fit in URL length limits

---

## Out of Scope

- **Multi-tenant isolation**: Assumes single-tenant or handles in future
- **Saved comparisons**: Persisting comparison configs to database (use URL for now)
- **Automated comparison suggestions**: AI-suggested runs to compare
- **Real-time collaborative comparison**: Multiple users viewing same comparison
- **Deep scenario transcript comparison**: Transcript-level diff view (future)
- **Cross-organization comparison**: Comparing runs from different orgs
- **Custom statistical tests**: User-defined comparison metrics

---

## Constitution Validation

### Compliance Check

| Requirement | Status | Notes |
|-------------|--------|-------|
| Files < 400 lines | PASS | Visualization components split into separate files |
| No `any` types | PASS | SC-007 explicitly requires this |
| Test coverage 80% minimum | PASS | SC-005 explicitly requires this |
| Structured logging | PASS | Will use existing logger patterns |
| Type safety | PASS | TypeScript strict mode, defined types above |
| Use Pull Requests | PASS | Feature branch specified |

### Folder Structure Compliance
Per constitution, should follow:
```
cloud/apps/web/src/
├── pages/
│   └── Compare.tsx              # Main compare page
├── components/
│   └── compare/
│       ├── index.ts             # Re-exports
│       ├── RunSelector.tsx      # Run selection UI
│       ├── ComparisonHeader.tsx # Header with stats
│       ├── VisualizationNav.tsx # Visualization tabs
│       └── visualizations/
│           ├── registry.ts      # Visualization registry
│           ├── OverviewViz.tsx  # Aggregate overview
│           ├── DecisionsViz.tsx # Distribution comparison
│           ├── ValuesViz.tsx    # Value win rate comparison
│           └── TimelineViz.tsx  # Model evolution timeline
├── hooks/
│   ├── useComparisonState.ts    # URL state management
│   └── useComparisonData.ts     # Data fetching for comparison
└── api/
    └── operations/
        └── comparison.ts        # GraphQL operations
```

**VALIDATION RESULT: PASS** - Spec addresses all constitutional requirements.

---

## Visualization Details

### Initial Visualizations (P1-P2)

| Visualization | Description | Primary Use Case |
|--------------|-------------|------------------|
| **Overview** | Summary table with aggregate stats per run | Quick orientation, identify key differences |
| **Decisions** | Distribution comparison (histogram overlay/side-by-side) | A/B testing definition changes |
| **Values** | Grouped bar chart of win rates per value per run | Detect value prioritization shifts |
| **Timeline** | Line chart of metrics over run dates | Model version drift detection |

### Future Visualizations (P3+)

| Visualization | Description | Primary Use Case |
|--------------|-------------|------------------|
| **Scenarios** | Scenario-level delta heatmap | Deep analysis of which scenarios changed |
| **Definition Diff** | Side-by-side definition text diff | Understanding intervention |
| **Agreement Matrix** | Cross-run model agreement comparison | Detecting if models converge/diverge |

---

## URL Schema

```
/compare?runs=id1,id2,id3&viz=decisions&model=gpt-4o&display=overlay
```

| Parameter | Required | Values | Default |
|-----------|----------|--------|---------|
| `runs` | Yes | Comma-separated run IDs | - |
| `viz` | No | `overview`, `decisions`, `values`, `timeline` | `overview` |
| `model` | No | Model identifier to filter | All models |
| `value` | No | Value identifier to highlight | None |
| `display` | No | `overlay`, `side-by-side` | `overlay` |

---

## Dependencies

### Requires from Previous Stages
- Analysis System with AnalysisResult (Stage 11) - Complete
- Run listing and filtering (Stage 9) - Complete
- GraphQL API infrastructure (Stage 3) - Complete
- Frontend component patterns (Stage 7) - Complete

### New Backend Requirements
- GraphQL query for fetching multiple runs' analysis in one request
- Optional: Backend computation for complex statistical comparisons

### New Frontend Requirements
- Compare page component
- Run selector component with multi-select
- Visualization registry system
- URL state management hook
- Comparison visualization components (4 initial)
- Statistical comparison utilities (effect size, KS test)

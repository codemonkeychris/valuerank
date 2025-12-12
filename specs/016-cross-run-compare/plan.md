# Implementation Plan: Cross-Run Comparison

**Branch**: `feature/cross-run-compare` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)

## Summary

Add a Compare tab enabling researchers to compare analysis results across multiple runs, with URL-shareable state and an extensible visualization registry. Primarily a frontend feature with one new GraphQL query for batch-fetching run analysis data.

---

## Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Version** | TypeScript 5.3+ |
| **Primary Dependencies** | React 18, react-router-dom 6, Recharts 3.5, urql 4.0, Lucide icons |
| **Storage** | PostgreSQL via Prisma (no schema changes - uses existing data) |
| **Testing** | Vitest 1.1, Testing Library React 14 |
| **Target Platform** | Vite SPA deployed to Railway |
| **Performance Goals** | Visualizations render < 3s for 2-5 runs; URL state loads < 2s |
| **Constraints** | Files < 400 lines; 80% coverage; No `any` types |

---

## Constitution Check

**Status**: PASS

### File Size Limits (§ File Size Limits)
- [x] All components < 400 lines - enforced via folder structure
- [x] Split visualizations into separate files
- [x] Extract hooks for URL state and data fetching

### TypeScript Standards (§ TypeScript Standards)
- [x] No `any` types - all comparison data fully typed
- [x] Strict mode required - project already configured
- [x] Type all function signatures and exports

### Testing Requirements (§ Testing Requirements)
- [x] 80% coverage minimum on new components
- [x] Test structure: describe/it pattern
- [x] Mock urql queries in component tests

### Code Organization (§ Code Organization)
- [x] Follow apps/web/src folder structure
- [x] Import order: External → Internal → Relative
- [x] Components in components/compare/

**Violations/Notes**: None. Plan aligns with all constitutional requirements.

---

## Architecture Decisions

### Decision 1: Client-Side Statistical Computation

**Chosen**: Compute effect sizes (Cohen's d) and distribution tests (KS) in the browser

**Rationale**:
- Analysis data is already computed and stored per-run (Stage 11)
- Comparison statistics are derived from existing aggregates
- Typical usage (2-5 runs, ~500 samples each) is lightweight
- Enables instant feedback as users change selections
- Aligns with existing pattern in AnalysisPanel (client-side filtering)

**Alternatives Considered**:
- **Backend computation**: Adds API complexity; unnecessary for aggregate comparisons
- **Python worker**: Overkill; would require new job queue patterns

**Tradeoffs**:
- Pros: Fast iteration, no backend changes, immediate interactivity
- Cons: Limited to aggregate data; deep scenario-level comparison would need backend

---

### Decision 2: URL State Management via React Router

**Chosen**: Use `useSearchParams` from react-router-dom for URL state

**Rationale**:
- Already using react-router-dom 6 for routing
- `useSearchParams` provides built-in URL sync
- Supports browser back/forward navigation
- Simple to encode: `?runs=id1,id2&viz=decisions&model=gpt-4o`

**Alternatives Considered**:
- **Custom history state**: More complex, less shareable
- **State management library (Zustand)**: Unnecessary; URL is the source of truth

**Tradeoffs**:
- Pros: Native browser behavior, shareable links, no extra dependencies
- Cons: URL length limits (~2000 chars); mitigated by limiting to 10 runs

---

### Decision 3: Visualization Registry Pattern

**Chosen**: Central registry object mapping visualization IDs to component metadata

**Rationale**:
- Enables adding new visualizations without modifying core Compare page
- Follows Open/Closed Principle
- Each visualization is self-contained with its own filter controls
- Similar pattern used for analysis tabs in AnalysisPanel

**Alternatives Considered**:
- **Dynamic imports with route config**: Over-engineered for 4-6 visualizations
- **Hardcoded switch statement**: Not extensible

**Tradeoffs**:
- Pros: Extensible, testable, clear contracts
- Cons: Small upfront abstraction cost (~50 lines registry code)

---

### Decision 4: Batch Query for Multiple Runs

**Chosen**: Add `runsWithAnalysis(ids: [ID!]!)` GraphQL query

**Rationale**:
- Existing `runs` query requires multiple requests for full analysis data
- Single batch query reduces waterfall
- Follows existing pattern of dataloader batching

**Alternatives Considered**:
- **Parallel individual queries**: More network requests, harder to coordinate loading state
- **Client-side caching with urql**: Good for repeated access, but initial load still slow

**Tradeoffs**:
- Pros: Single round-trip, consistent loading state
- Cons: New query to implement (straightforward with existing dataloaders)

---

### Decision 5: Recharts for Comparison Visualizations

**Chosen**: Use existing Recharts library

**Rationale**:
- Already used throughout the app (ScoreDistributionChart, etc.)
- Supports all needed chart types: bar, line, composed
- Familiar patterns for tooltips, legends, responsiveness

**Alternatives Considered**:
- **D3.js directly**: More powerful but more complex
- **Chart.js**: Would add another dependency

**Tradeoffs**:
- Pros: Consistency, no new dependencies, existing patterns
- Cons: Some complex visualizations (heatmaps) may need custom components

---

## Project Structure

### Frontend Changes (apps/web)

```
cloud/apps/web/src/
├── pages/
│   └── Compare.tsx                    # NEW: Main compare page
├── components/
│   └── compare/                       # NEW: Compare feature folder
│       ├── index.ts                   # Re-exports
│       ├── types.ts                   # Comparison types
│       ├── RunSelector.tsx            # Multi-select run picker
│       ├── RunSelectorItem.tsx        # Individual run card
│       ├── ComparisonHeader.tsx       # Selected runs summary
│       ├── VisualizationNav.tsx       # Visualization tab navigation
│       ├── ComparisonFilters.tsx      # Model/value filter controls
│       └── visualizations/
│           ├── registry.ts            # Visualization registration
│           ├── OverviewViz.tsx        # Aggregate stats table
│           ├── DecisionsViz.tsx       # Distribution comparison
│           ├── ValuesViz.tsx          # Win rate comparison
│           └── TimelineViz.tsx        # Model drift over time
├── hooks/
│   ├── useComparisonState.ts          # NEW: URL state management
│   └── useComparisonData.ts           # NEW: Batch data fetching
├── api/
│   └── operations/
│       └── comparison.ts              # NEW: GraphQL operations
└── lib/
    └── statistics/
        ├── index.ts                   # NEW: Stats utilities
        ├── cohens-d.ts                # Effect size calculation
        └── ks-test.ts                 # Distribution test
```

### Backend Changes (apps/api)

```
cloud/apps/api/src/graphql/
├── queries/
│   └── run.ts                         # MODIFY: Add runsWithAnalysis query
└── types/
    └── run.ts                         # MODIFY: Ensure analysis fields exposed
```

### Navigation Changes

```
cloud/apps/web/src/
├── components/layout/
│   └── NavTabs.tsx                    # MODIFY: Add Compare tab
└── App.tsx                            # MODIFY: Add /compare route
```

---

## Component Design

### Compare Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: "Compare Runs"                          [? Help]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │   Run Selector      │  │   Comparison Panel              │  │
│  │   ───────────────   │  │   ─────────────────             │  │
│  │   [Search runs...]  │  │   Selected: Run A, Run B, Run C │  │
│  │                     │  │                                 │  │
│  │   □ Run A          │  │   [Overview] [Decisions] [Values]│  │
│  │     Def: Trolley    │  │   [Timeline]                    │  │
│  │     3 models, 125n  │  │                                 │  │
│  │                     │  │   Filters: [Model ▼] [Value ▼]  │  │
│  │   ☑ Run B          │  │                                 │  │
│  │     Def: Trolley v2 │  │   ┌─────────────────────────┐  │  │
│  │     3 models, 125n  │  │   │                         │  │  │
│  │                     │  │   │   Active Visualization  │  │  │
│  │   ☑ Run C          │  │   │                         │  │  │
│  │     Def: Trolley v2 │  │   │                         │  │  │
│  │     2 models, 100n  │  │   │                         │  │  │
│  │                     │  │   └─────────────────────────┘  │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### URL State Schema

```typescript
// URL: /compare?runs=id1,id2,id3&viz=decisions&model=gpt-4o&display=overlay

type ComparisonURLState = {
  runs: string[];              // Required: comma-separated run IDs
  viz: VisualizationType;      // Default: 'overview'
  model?: string;              // Filter to specific model
  value?: string;              // Filter to specific value
  display?: 'overlay' | 'side-by-side';  // Default: 'overlay'
};
```

### Visualization Registry Interface

```typescript
// visualizations/registry.ts

import type { LucideIcon } from 'lucide-react';
import type { RunWithAnalysis, ComparisonFilters } from '../types';

export type ComparisonVisualizationProps = {
  runs: RunWithAnalysis[];
  filters: ComparisonFilters;
  onFilterChange: (filters: ComparisonFilters) => void;
};

export type VisualizationRegistration = {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<ComparisonVisualizationProps>;
  minRuns: number;
  description: string;
};

export const visualizationRegistry: Record<string, VisualizationRegistration> = {
  overview: { /* ... */ },
  decisions: { /* ... */ },
  values: { /* ... */ },
  timeline: { /* ... */ },
};

export function getVisualization(id: string): VisualizationRegistration | null {
  return visualizationRegistry[id] ?? null;
}

export function listVisualizations(): VisualizationRegistration[] {
  return Object.values(visualizationRegistry);
}
```

---

## GraphQL Schema Addition

### New Query: runsWithAnalysis

```graphql
# Add to existing Run queries

extend type Query {
  """
  Fetch multiple runs with their full analysis data in a single request.
  Used for cross-run comparison. Limited to 10 runs maximum.
  """
  runsWithAnalysis(ids: [ID!]!): [Run!]!
}
```

### Implementation

```typescript
// apps/api/src/graphql/queries/run.ts

builder.queryField('runsWithAnalysis', (t) =>
  t.field({
    type: [RunType],
    args: {
      ids: t.arg.idList({ required: true }),
    },
    resolve: async (_, { ids }, ctx) => {
      // Limit to 10 runs for performance
      if (ids.length > 10) {
        throw new ValidationError('Maximum 10 runs can be compared at once');
      }

      return ctx.dataloaders.run.loadMany(ids);
    },
  })
);
```

---

## Statistical Utilities

### Cohen's d (Effect Size)

```typescript
// lib/statistics/cohens-d.ts

/**
 * Calculate Cohen's d effect size between two samples.
 * d = (M1 - M2) / pooled_std_dev
 *
 * Interpretation:
 * - |d| < 0.2: negligible
 * - 0.2 <= |d| < 0.5: small
 * - 0.5 <= |d| < 0.8: medium
 * - |d| >= 0.8: large
 */
export function cohensD(
  mean1: number, stdDev1: number, n1: number,
  mean2: number, stdDev2: number, n2: number
): { d: number; interpretation: string } {
  // Pooled standard deviation
  const pooledStd = Math.sqrt(
    ((n1 - 1) * stdDev1 ** 2 + (n2 - 1) * stdDev2 ** 2) /
    (n1 + n2 - 2)
  );

  if (pooledStd === 0) return { d: 0, interpretation: 'negligible' };

  const d = (mean1 - mean2) / pooledStd;
  const absD = Math.abs(d);

  let interpretation: string;
  if (absD < 0.2) interpretation = 'negligible';
  else if (absD < 0.5) interpretation = 'small';
  else if (absD < 0.8) interpretation = 'medium';
  else interpretation = 'large';

  return { d, interpretation };
}
```

### Kolmogorov-Smirnov Test (Simplified)

```typescript
// lib/statistics/ks-test.ts

/**
 * Simplified KS test for comparing decision distributions.
 * Returns the maximum distance between two empirical CDFs.
 *
 * Note: For full statistical rigor, use a library. This is
 * sufficient for visual highlighting of distribution differences.
 */
export function ksStatistic(dist1: number[], dist2: number[]): number {
  // Build empirical CDFs
  const cdf1 = buildECDF(dist1);
  const cdf2 = buildECDF(dist2);

  // Find all unique values
  const allValues = [...new Set([...dist1, ...dist2])].sort((a, b) => a - b);

  // Find maximum difference
  let maxDiff = 0;
  for (const x of allValues) {
    const diff = Math.abs(cdf1(x) - cdf2(x));
    if (diff > maxDiff) maxDiff = diff;
  }

  return maxDiff;
}

function buildECDF(data: number[]): (x: number) => number {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  return (x: number) => {
    let count = 0;
    for (const val of sorted) {
      if (val <= x) count++;
      else break;
    }
    return count / n;
  };
}
```

---

## Testing Strategy

### Unit Tests

| Component | Test Focus |
|-----------|------------|
| `useComparisonState` | URL parsing, state updates, history navigation |
| `useComparisonData` | Loading states, error handling, data transformation |
| `cohensD` | Calculation accuracy, edge cases (zero std dev) |
| `ksStatistic` | Distribution comparison accuracy |
| `visualizationRegistry` | Registration, lookup, validation |

### Component Tests

| Component | Test Focus |
|-----------|------------|
| `RunSelector` | Selection toggle, search filtering, max selection |
| `VisualizationNav` | Tab switching, disabled states |
| `OverviewViz` | Stats table rendering, effect size display |
| `DecisionsViz` | Chart rendering, overlay/side-by-side toggle |
| `ValuesViz` | Grouped bar chart, value highlighting |
| `TimelineViz` | Line chart, date ordering, tooltips |

### Integration Tests

| Scenario | Test Focus |
|----------|------------|
| URL sharing | Load comparison from URL, verify state matches |
| Full flow | Select runs → choose viz → apply filter → verify render |

---

## Migration Notes

- **No database migrations required** - uses existing Run and AnalysisResult data
- **No breaking changes** - additive feature only
- **Backward compatible** - Compare tab is new, doesn't affect existing pages

---

## Dependencies

### Existing (No Changes)
- `react-router-dom` - URL state management
- `recharts` - Charts and visualizations
- `urql` - GraphQL client
- `lucide-react` - Icons

### New Dependencies
- None required - all functionality achievable with existing stack

---

## Performance Considerations

1. **Batch Query**: Single request for all selected runs vs. N individual requests
2. **Lazy Visualization Loading**: Only compute/render active visualization
3. **Memoization**: useMemo for expensive statistical computations
4. **Virtual Scrolling**: Consider for run selector if list grows large (future)

---

## Security Considerations

1. **Run Access**: Query only returns runs user has access to (existing auth)
2. **URL Length**: Limit run selection to 10 to prevent URL overflow attacks
3. **Input Validation**: Validate run IDs before query to prevent injection

---

## Rollout Plan

### Phase 1: Core Infrastructure (P1)
- Navigation and routing
- URL state management hook
- GraphQL batch query
- Run selector component

### Phase 2: Visualizations (P1)
- Visualization registry
- Overview visualization
- Decisions visualization
- Values visualization

### Phase 3: Enhanced Features (P2)
- Timeline visualization
- Statistical utilities (Cohen's d, KS)
- Filter controls

### Phase 4: Polish (P3)
- Definition diff view (if time permits)
- Export functionality (future)

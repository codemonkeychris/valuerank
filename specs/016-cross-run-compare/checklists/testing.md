# Testing Quality Checklist

**Purpose**: Validate test coverage and quality
**Feature**: [tasks.md](../tasks.md)

## Coverage Requirements (per constitution)

### Minimum Targets
- [ ] Line coverage ≥ 80%
  - Reference: Constitution § Testing Requirements
- [ ] Branch coverage ≥ 75%
- [ ] Function coverage ≥ 80%

### Coverage Command
```bash
DATABASE_URL="postgresql://valuerank:valuerank@localhost:5433/valuerank_test" \
JWT_SECRET="test-secret-that-is-at-least-32-characters-long" \
npx turbo run test:coverage
```

## Test Structure (per constitution)

### File Organization
- [ ] Tests mirror source structure
  - `src/components/compare/` → `tests/components/compare/`
  - `src/hooks/` → `tests/hooks/`
  - `src/lib/statistics/` → `tests/lib/statistics/`
  - Reference: Constitution § Test Files Location

### Test Format
- [ ] Use describe/it pattern
- [ ] Clear test descriptions
- [ ] One assertion focus per test
- [ ] Setup in beforeEach where appropriate

## Pre-Commit Requirements

### All Tests Pass
- [ ] Run test suite before commit
  - Command: `npm test` (from cloud/)
- [ ] No skipped tests without documented reason

### Build Succeeds
- [ ] TypeScript compiles without errors
  - Command: `npm run typecheck`
- [ ] Vite build completes
  - Command: `npm run build`

### Lint Clean
- [ ] No ESLint errors
  - Command: `npm run lint`

## Unit Test Coverage

### Hooks
- [ ] useComparisonState
  - URL parsing (valid/invalid params)
  - State updates trigger URL changes
  - History navigation (back/forward)
  - Edge cases (empty runs, too many runs)

- [ ] useComparisonData
  - Loading state
  - Error state
  - Data transformation
  - Cache behavior

### Statistical Utilities
- [ ] cohens-d.ts
  - Calculation accuracy
  - Interpretation boundaries
  - Edge cases (zero std dev)

- [ ] ks-test.ts
  - ECDF construction
  - Statistic calculation
  - Identical distributions (should be 0)

### Visualization Registry
- [ ] Registration works
- [ ] Lookup by ID
- [ ] List all visualizations
- [ ] minRuns validation

## Component Test Coverage

### RunSelector
- [ ] Renders run list
- [ ] Selection toggle works
- [ ] Max selection enforced (10)
- [ ] Search filtering
- [ ] Analysis status indicator

### VisualizationNav
- [ ] Renders all registered visualizations
- [ ] Tab switching updates URL
- [ ] Disabled when minRuns not met

### Visualizations (each)
- [ ] Renders with valid data
- [ ] Handles empty data gracefully
- [ ] Filter controls work
- [ ] Tooltips display correctly

## Integration Tests

### Compare Page Flow
- [ ] Load with URL params → state restored
- [ ] Select runs → URL updates
- [ ] Change visualization → URL updates
- [ ] Apply filter → visualization updates
- [ ] Share URL → identical state loads

### GraphQL Integration
- [ ] runsWithAnalysis query works
- [ ] Handles missing runs gracefully
- [ ] Respects 10-run limit

## Mock Patterns

### urql Mocking
```typescript
import { Provider } from 'urql';
import { fromValue } from 'wonka';

const mockClient = {
  executeQuery: () => fromValue({ data: mockData }),
};

<Provider value={mockClient}>{children}</Provider>
```

### Router Mocking
```typescript
import { MemoryRouter } from 'react-router-dom';

<MemoryRouter initialEntries={['/compare?runs=id1,id2']}>
  {children}
</MemoryRouter>
```

## Performance Tests

- [ ] Visualization renders < 3s for 5 runs
- [ ] Statistical calculations don't block UI
- [ ] Large run lists (100+) remain responsive

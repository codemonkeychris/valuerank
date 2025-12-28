# Implementation Plan: Compare Tag Filtering

**Branch**: `feature/022-compare-tag-filtering` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)

## Summary

Add dedicated tag filtering to the Compare page's RunSelector component, enabling users to filter available runs by definition tags. Implementation follows existing client-side filtering patterns from Runs and Analysis pages, with URL persistence for shareability.

---

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18, react-router-dom v6, urql, @tanstack/react-virtual
**Storage**: No database changes - uses existing tags from definitions
**Testing**: Vitest + @testing-library/react
**Target Platform**: Web (Vite build)
**Performance Goals**: Filtered results update within 500ms (per SC-002)
**Constraints**: Must work with existing infinite scroll and virtualization

---

## Constitution Check

**Status**: PASS

### Code Organization (per cloud/CLAUDE.md)

- [x] File size < 400 lines - New components will be small, focused modules
- [x] No `any` types - All types will be properly typed
- [x] Strict TypeScript mode compliance

### Testing Requirements

- [x] Test coverage targets (80% minimum) - Will add tests for new components
- [x] Test structure with describe/it blocks

---

## Architecture Decisions

### Decision 1: Client-Side vs Server-Side Tag Filtering

**Chosen**: Client-side filtering (consistent with Runs/Analysis pages)

**Rationale**:
- Existing pattern in Runs.tsx and Analysis.tsx filters by tags client-side
- Runs are already loaded via infinite scroll with analysis data
- Simpler implementation without API changes
- Spec explicitly allows: "client-side filtering is acceptable for the initial implementation"

**Alternatives Considered**:
- Server-side filtering (add `tagIds` to GraphQL runs query): More scalable but requires API changes, breaking from current pattern. Can be added later if needed.

**Tradeoffs**:
- Pros: Fast implementation, consistent patterns, no API changes
- Cons: Must load runs before filtering; for very large datasets, server-side would be more efficient

---

### Decision 2: State Management for Tag Filters

**Chosen**: Extend `useComparisonState` hook to include tag filter URL params

**Rationale**:
- Consistent with existing URL state management in Compare page
- Enables URL persistence (FR-007, User Story 4)
- Browser history support comes free with react-router-dom

**URL Format**: `/compare?runs=id1,id2&tags=tagId1,tagId2&viz=overview`

---

### Decision 3: Tag Filter UI Placement

**Chosen**: Integrate into RunSelector header, below search box

**Rationale**:
- Follows established pattern from RunFilters component
- Keeps filtering controls grouped with run selection
- Responsive-friendly placement

**UI Components**:
1. Tag filter button with badge showing active count
2. Dropdown with checkable tag list
3. Selected tag chips with remove buttons
4. "Clear tags" action

---

### Decision 4: Filter Logic

**Chosen**: AND logic for multiple tags (runs must match ALL selected tags)

**Rationale**:
- Consistent with Runs page behavior
- More useful for narrowing results
- Matches spec requirement (FR-002)

---

## Project Structure

### Files to Modify

```
cloud/apps/web/src/
├── hooks/
│   └── useComparisonState.ts      # Add tag filter URL params
├── components/compare/
│   ├── RunSelector.tsx            # Add TagFilterDropdown integration
│   └── TagFilterDropdown.tsx      # NEW: Reusable tag filter component
├── api/operations/
│   └── comparison.ts              # Types already include tags
└── pages/
    └── Compare.tsx                # Wire up tag filtering
```

### New Component: TagFilterDropdown

Extract a reusable component from the existing tag filter pattern in RunFilters.tsx. This avoids code duplication and ensures UI consistency.

**Props Interface**:
```typescript
type TagFilterDropdownProps = {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
};
```

---

## Implementation Phases

### Phase 1: URL State Extension
- Add `tags` param to `useComparisonState`
- Parse/serialize tag IDs from/to URL
- Maintain browser history support

### Phase 2: Tag Filter UI Component
- Create `TagFilterDropdown` component
- Use `useTags` hook for available tags
- Implement multi-select dropdown with chips
- Badge showing active filter count

### Phase 3: RunSelector Integration
- Add TagFilterDropdown to RunSelector header
- Wire up state from useComparisonState
- Implement client-side filtering in filteredRuns memo

### Phase 4: Edge Cases & Polish
- Empty tag list handling
- No matching runs empty state
- Orphaned tag filters (tag deleted but in URL)
- Combined text search + tag filtering

---

## Data Flow

```
URL params (?tags=id1,id2)
       ↓
useComparisonState (parse tags from URL)
       ↓
Compare.tsx (pass selectedTagIds to RunSelector)
       ↓
RunSelector
  ├── TagFilterDropdown (UI for tag selection)
  └── filteredRuns useMemo (apply tag + search filters)
       ↓
Virtualized run list (filtered results)
```

---

## Key Implementation Details

### Tag Filtering Logic (RunSelector)

```typescript
const filteredRuns = useMemo(() => {
  let result = runs;

  // Apply tag filter (AND logic)
  if (selectedTagIds.length > 0) {
    result = result.filter((run) => {
      const runTagIds = run.definition?.tags?.map((t) => t.id) || [];
      return selectedTagIds.every((tagId) => runTagIds.includes(tagId));
    });
  }

  // Apply text search (existing logic)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter((run) => {
      // existing search logic
    });
  }

  return result;
}, [runs, selectedTagIds, searchQuery]);
```

### URL Param Handling (useComparisonState)

```typescript
const PARAM_TAGS = 'tags';

// Parse
const selectedTagIds = useMemo(
  () => parseTagIds(searchParams.get(PARAM_TAGS)),
  [searchParams]
);

// Update
const setSelectedTagIds = useCallback((ids: string[]) => {
  updateUrl({
    [PARAM_TAGS]: ids.length > 0 ? ids.join(',') : undefined,
  }, true); // replaceState for filter changes
}, [updateUrl]);
```

---

## Testing Strategy

### Unit Tests
- `TagFilterDropdown.test.tsx`: Render, selection, clear actions
- `useComparisonState.test.ts`: URL parsing/serialization for tags

### Integration Tests
- `RunSelector.test.tsx`: Tag filtering + search combo
- `Compare.test.tsx`: End-to-end flow with tag filters

### Manual Testing (quickstart.md)
- Single tag filter
- Multi-tag filter (AND logic)
- Combined with text search
- URL persistence / sharing
- Browser back/forward

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance with many runs | Virtualization already in place; filtering is O(n) which is acceptable |
| UI inconsistency | Reuse existing tag filter patterns from RunFilters |
| URL bloat with many tags | Tags use IDs (short cuid strings); limit practical selection |
| Infinite scroll + filtering | Disable load-more when text search active (already implemented); same for tag filter |

---

## Success Metrics

- [x] Tag filter within 2 clicks (SC-001) - Dropdown + checkbox
- [x] Results update < 500ms (SC-002) - Client-side filtering is instant
- [x] UI consistent with Runs/Definitions (SC-003) - Reuse component patterns
- [x] Mobile responsive (SC-004) - Use existing responsive patterns

---

## Next Steps

1. Review this plan for technical accuracy
2. Generate tasks with `feature-tasks` skill
3. Implement in phases with incremental commits

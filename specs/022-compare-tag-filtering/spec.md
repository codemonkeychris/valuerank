# Feature Specification: Compare Tag Filtering

**Feature Branch**: `feature/022-compare-tag-filtering`
**Created**: 2025-12-28
**Status**: Draft
**Input**: Add tag filtering to the compare experience

---

## Overview

Add dedicated tag filtering to the Compare page's run selector, allowing users to filter available runs by definition tags. Currently, the Compare page only has text-based search which includes tag text, but lacks the explicit tag filter UI present in the Runs and Definitions pages.

---

## User Scenarios & Testing

### User Story 1 - Filter Runs by Single Tag (Priority: P1)

As a researcher comparing evaluation runs, I need to filter the available runs by a specific tag so that I can quickly find runs for a particular experiment category (e.g., "safety", "ethics", "production").

**Why this priority**: Core filtering capability. Without tag filtering, users must scroll through potentially hundreds of runs or rely on text search to find related runs.

**Independent Test**: With runs from multiple definitions with different tags, user can select a single tag and see only runs whose definitions have that tag.

**Acceptance Scenarios**:

1. **Given** I am on the Compare page with runs from definitions tagged "safety" and "ethics", **When** I click the Tags filter button and select "safety", **Then** only runs from definitions with the "safety" tag are shown in the run selector.

2. **Given** I have filtered runs by tag "safety", **When** I deselect the "safety" tag, **Then** all available runs are shown again.

3. **Given** the run selector is showing filtered results, **When** I look at the run count display, **Then** it shows the filtered count (e.g., "5 of 50 runs").

---

### User Story 2 - Filter by Multiple Tags (Priority: P1)

As a researcher, I need to filter runs by multiple tags simultaneously so that I can narrow down to runs that match all my criteria (e.g., runs that are both "production" AND "v2").

**Why this priority**: Essential for workspaces with many tags. Single-tag filtering is insufficient when users organize with multiple classification dimensions.

**Independent Test**: Select two or more tags and verify only runs matching ALL selected tags appear.

**Acceptance Scenarios**:

1. **Given** I have selected tag "safety", **When** I also select tag "production", **Then** only runs whose definitions have BOTH tags are shown (AND logic).

2. **Given** I have multiple tags selected, **When** I click on a selected tag chip, **Then** that tag is removed from the filter and the results update.

3. **Given** I have multiple tags selected showing a filtered result, **When** I view the tag filter button, **Then** it shows a badge with the count of active tag filters.

---

### User Story 3 - Clear Tag Filters (Priority: P2)

As a user, I need to quickly clear all active tag filters so that I can start a fresh search without manually deselecting each tag.

**Why this priority**: Improves efficiency but users can manually deselect tags as an alternative.

**Independent Test**: With multiple tags selected, user can clear all filters with one action.

**Acceptance Scenarios**:

1. **Given** I have 3 tags selected, **When** I click "Clear tags" or "Clear all filters", **Then** all tag filters are removed and all runs are shown.

2. **Given** tag filters are active, **When** I clear filters, **Then** the text search query (if any) is preserved.

---

### User Story 4 - Persist Tag Filters in URL (Priority: P2)

As a user, I need my tag filter selections to persist in the URL so that I can share filtered views with colleagues or bookmark specific filter combinations.

**Why this priority**: Important for collaboration and workflow, but the feature works without URL persistence.

**Independent Test**: Select tags, copy URL, open in new tab, verify same tags are pre-selected.

**Acceptance Scenarios**:

1. **Given** I select tags "safety" and "ethics", **When** I copy the page URL, **Then** the URL includes the tag filter state (e.g., `?runs=...&tags=tag1,tag2`).

2. **Given** I open a Compare URL with tag parameters, **When** the page loads, **Then** the tag filters are pre-applied and the run list is filtered accordingly.

3. **Given** I modify tag filters, **When** I navigate back with browser history, **Then** the previous tag filter state is restored.

---

### User Story 5 - Combined Text and Tag Filtering (Priority: P3)

As a user, I want text search and tag filtering to work together so that I can find runs matching both criteria simultaneously.

**Why this priority**: Enhancement for power users. Most filtering needs are met by tags alone or text alone.

**Independent Test**: Apply both text search and tag filter, verify results match both constraints.

**Acceptance Scenarios**:

1. **Given** I have filtered by tag "safety", **When** I type "gpt-4" in the search box, **Then** only runs matching BOTH the tag AND the search text are shown.

2. **Given** I have both text search and tag filters active, **When** I clear only the text search, **Then** the tag filters remain active.

---

## Edge Cases

- **Empty tag list**: If no tags exist in the system, the tag filter dropdown shows "No tags available" message.
- **No matching runs**: If selected tags result in zero matching runs, show an appropriate empty state message.
- **Orphaned tag filters**: If a tag in the URL no longer exists (was deleted), ignore that tag ID gracefully.
- **Large tag list**: If there are many tags (50+), the dropdown should be scrollable with reasonable max height.
- **Tag inheritance**: Runs should match if their definition has the tag directly OR inherited from a parent definition.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a tag filter dropdown in the Compare page RunSelector component.
- **FR-002**: Users MUST be able to select multiple tags; results show runs matching ALL selected tags (AND logic).
- **FR-003**: Selected tags MUST be displayed as removable chips below or beside the dropdown.
- **FR-004**: The tag filter button MUST show a badge indicating count of active tag filters when > 0.
- **FR-005**: System MUST update the run list immediately when tags are selected/deselected.
- **FR-006**: Tag filtering MUST work in combination with existing text search (both constraints apply).
- **FR-007**: System SHOULD persist tag filter state in URL query parameters.
- **FR-008**: System MUST support clearing all tag filters with a single action.
- **FR-009**: Tag filtering MUST consider inherited tags (from parent definitions).

---

## Success Criteria

- **SC-001**: Users can filter runs by tag within 2 clicks (open dropdown + select tag).
- **SC-002**: Filtered results update within 500ms of tag selection.
- **SC-003**: Tag filter UI is consistent with existing tag filtering in Runs and Definitions pages.
- **SC-004**: Feature works on mobile viewports (responsive design).

---

## Assumptions

1. The existing `useTags` hook provides all available tags efficiently.
2. The `useComparisonData` hook or underlying query can be extended to filter by tag IDs.
3. Tag filtering logic mirrors the existing implementation in `RunFilters` and `DefinitionFilters` components.
4. Server-side filtering is preferred for large datasets, but client-side filtering is acceptable for the initial implementation if runs are already loaded.
5. The current infinite scroll behavior in RunSelector should work with tag filtering applied.

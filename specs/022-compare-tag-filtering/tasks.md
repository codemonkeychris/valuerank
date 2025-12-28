# Tasks: Compare Tag Filtering

**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: User story (US1, US2, US3, US4, US5)
- Include exact file paths from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and branch setup

- [X] T001 Create feature branch `feature/022-compare-tag-filtering`

**Checkpoint**: Ready to begin implementation

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

⚠️ **CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Create `TagFilterDropdown` component in `cloud/apps/web/src/components/compare/TagFilterDropdown.tsx`
  - Extract reusable tag filter dropdown from existing `RunFilters.tsx` pattern
  - Props: `selectedTagIds`, `onTagsChange`, `className?`
  - Include dropdown, checkboxes, badge count
- [X] T003 [P] Add unit tests for TagFilterDropdown in `cloud/apps/web/tests/components/compare/TagFilterDropdown.test.tsx`
  - Test render with tags
  - Test tag selection/deselection
  - Test badge count display
- [X] T004 Export TagFilterDropdown from `cloud/apps/web/src/components/compare/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 & 2 - Tag Filtering (Priority: P1) 🎯 MVP

**Goal**: Filter runs by single or multiple tags with AND logic

**Independent Test**: Select tags and verify only matching runs appear

### Implementation for User Stories 1 & 2

- [X] T005 [US1] Add `selectedTagIds` state to `RunSelector` in `cloud/apps/web/src/components/compare/RunSelector.tsx`
  - Add props: `selectedTagIds: string[]`, `onTagIdsChange: (ids: string[]) => void`
  - Integrate TagFilterDropdown below search input
- [X] T006 [US1] Implement tag filtering logic in `filteredRuns` useMemo in `cloud/apps/web/src/components/compare/RunSelector.tsx`
  - Apply AND logic: run must match ALL selected tags
  - Tag filtering applies before text search
- [X] T007 [US2] Update count display to show filtered count in `cloud/apps/web/src/components/compare/RunSelector.tsx`
  - Format: "X of Y runs" when filtered
- [X] T008 [US1] Wire up tag state in Compare page in `cloud/apps/web/src/pages/Compare.tsx`
  - Pass selectedTagIds and handler to RunSelector
  - Initial implementation: local state (URL persistence in US4)
- [X] T009 [US1] Add integration tests for tag filtering in `cloud/apps/web/tests/components/compare/RunSelector.test.tsx`
  - Test single tag filter
  - Test multi-tag filter (AND logic)
  - Test tag removal

**Checkpoint**: Users can filter runs by single or multiple tags (MVP complete)

---

## Phase 4: User Story 3 - Clear Tag Filters (Priority: P2)

**Goal**: Allow users to quickly clear all tag filters

**Independent Test**: With tags selected, clear all with one action

### Implementation for User Story 3

- [X] T010 [US3] Add "Clear tags" action to TagFilterDropdown in `cloud/apps/web/src/components/compare/TagFilterDropdown.tsx`
  - Show only when tags are selected
  - Clears all selected tags
- [X] T011 [US3] Add selected tag chips display to RunSelector in `cloud/apps/web/src/components/compare/RunSelector.tsx`
  - Show chips for each selected tag
  - X button to remove individual tags
- [X] T012 [US3] Add tests for clear functionality in `cloud/apps/web/tests/components/compare/TagFilterDropdown.test.tsx`
  - Test clear all action
  - Test individual tag removal via chip

**Checkpoint**: Users can clear tag filters with one action

---

## Phase 5: User Story 4 - URL Persistence (Priority: P2)

**Goal**: Persist tag filters in URL for sharing and bookmarking

**Independent Test**: Select tags, copy URL, open in new tab, verify same filters

### Implementation for User Story 4

- [X] T013 [US4] Add `tags` URL parameter to `useComparisonState` in `cloud/apps/web/src/hooks/useComparisonState.ts`
  - Add PARAM_TAGS constant
  - Parse tags from URL: `parseTagIds(searchParams.get(PARAM_TAGS))`
  - Serialize tags to URL on change
- [X] T014 [US4] Add `setSelectedTagIds` callback to `useComparisonState` in `cloud/apps/web/src/hooks/useComparisonState.ts`
  - Use `replaceState` for filter changes (avoid polluting history)
  - Handle empty array (remove param from URL)
- [X] T015 [US4] Update Compare.tsx to use URL-based tag state in `cloud/apps/web/src/pages/Compare.tsx`
  - Replace local state with useComparisonState values
  - Wire up setSelectedTagIds handler
- [X] T016 [US4] Add tests for URL state in `cloud/apps/web/tests/hooks/useComparisonState.test.ts`
  - Test tag parsing from URL
  - Test URL update on tag change
  - Test browser history behavior

**Checkpoint**: Tag filters persist in URL and can be shared

---

## Phase 6: User Story 5 - Combined Text + Tag Filtering (Priority: P3)

**Goal**: Text search and tag filtering work together

**Independent Test**: Apply both filters and verify results match both constraints

### Implementation for User Story 5

- [X] T017 [US5] Verify combined filtering logic in `cloud/apps/web/src/components/compare/RunSelector.tsx`
  - Tag filter applies first
  - Text search applies to tag-filtered results
  - Both constraints must match (AND)
- [X] T018 [US5] Ensure clear text preserves tag filters in `cloud/apps/web/src/components/compare/RunSelector.tsx`
  - Clearing search input doesn't clear tags
  - Clearing tags doesn't clear search input
- [X] T019 [US5] Add combined filtering tests in `cloud/apps/web/tests/components/compare/RunSelector.test.tsx`
  - Test tag + text filter combination
  - Test clear text preserves tags
  - Test clear tags preserves text

**Checkpoint**: Combined filtering works as expected

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, documentation, and final validation

- [X] T020 [P] Handle empty tag list edge case in `TagFilterDropdown`
  - Show "No tags available" message
- [X] T021 [P] Handle no matching runs empty state in `RunSelector`
  - Update EmptyState component to handle tag filter case
- [X] T022 [P] Handle orphaned tag filters (tag in URL but deleted) in `Compare.tsx`
  - Filter out non-existent tag IDs gracefully
- [X] T023 [P] Ensure tag dropdown is scrollable with max-height for large tag lists
  - Also widened dropdown to w-80 for better readability
- [X] T024 Run manual validation from quickstart.md
- [X] T025 Verify mobile responsiveness (per SC-004)
- [X] T026 Run full test suite and verify coverage

**Checkpoint**: Feature complete with all edge cases handled

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundation (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories 1&2 (Phase 3)**: Depend on Foundation - MVP
- **User Story 3 (Phase 4)**: Depends on Phase 3
- **User Story 4 (Phase 5)**: Depends on Phase 3
- **User Story 5 (Phase 6)**: Depends on Phases 4 & 5
- **Polish (Phase 7)**: Depends on all user stories

### Parallel Opportunities

- T003 can run parallel with T002 (test file vs implementation)
- T020-T023 can run in parallel (independent edge cases)
- Phases 4 and 5 can be worked on in parallel after Phase 3

### Critical Path

```
T001 → T002 → T005 → T006 → T008 → (MVP Ready)
                                    ↓
                              T010 & T013 (parallel)
                                    ↓
                                  T017
                                    ↓
                                T020-T026
```

---

## Task Statistics

- **Total**: 26 tasks
- **Phase 1 (Setup)**: 1 task
- **Phase 2 (Foundation)**: 3 tasks - BLOCKS user stories
- **Phase 3 (US1 & US2 - MVP)**: 5 tasks
- **Phase 4 (US3)**: 3 tasks
- **Phase 5 (US4)**: 4 tasks
- **Phase 6 (US5)**: 3 tasks
- **Phase 7 (Polish)**: 7 tasks
- **Parallel opportunities**: 9 tasks marked [P]

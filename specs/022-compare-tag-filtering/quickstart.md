# Quickstart: Compare Tag Filtering

## Prerequisites

- [ ] Development environment running (`npm run dev` from cloud/)
- [ ] Database has runs with different tags on their definitions
- [ ] At least 2-3 different tags exist in the system
- [ ] Multiple runs have analysis data for comparison

## Setup Test Data

If you need test data:
1. Create definitions with different tags (e.g., "safety", "ethics", "production")
2. Start runs on those definitions
3. Ensure runs complete and have analysis data

---

## Testing User Story 1: Filter Runs by Single Tag

**Goal**: Verify single tag filtering shows only matching runs

**Steps**:
1. Navigate to `/compare`
2. Observe the run selector panel on the left
3. Click the "Tags" filter button
4. Select a single tag (e.g., "safety")

**Expected**:
- Only runs from definitions with the "safety" tag appear
- The run count updates to show filtered count (e.g., "5 of 50 runs")
- The tag filter button shows a badge with "1"

**Verification**:
- Click on any visible run and verify its definition has the selected tag

---

## Testing User Story 2: Filter by Multiple Tags

**Goal**: Verify AND logic for multiple tag selection

**Steps**:
1. With a tag already selected, open the tag dropdown again
2. Select a second tag (e.g., "production")
3. Observe the filtered results

**Expected**:
- Only runs whose definitions have BOTH tags are shown
- The filter button badge shows "2"
- Results are narrower than single-tag filter

**Verification**:
- If no runs match both tags, empty state is shown
- Click a selected tag chip to remove it; results expand to single-tag filter

---

## Testing User Story 3: Clear Tag Filters

**Goal**: Verify quick clear action works

**Steps**:
1. Select 2-3 tags
2. Click "Clear tags" button

**Expected**:
- All tag filters are removed
- All runs are shown again
- Tag filter button no longer shows badge

---

## Testing User Story 4: Persist Tag Filters in URL

**Goal**: Verify URL persistence for sharing

**Steps**:
1. Select tags "safety" and "ethics"
2. Copy the page URL
3. Open a new browser tab
4. Paste the URL and navigate

**Expected**:
- URL includes tag parameters (e.g., `?tags=tagId1,tagId2`)
- New tab shows the same tag filters pre-selected
- Run list is already filtered

**Browser History Test**:
1. Select tag A
2. Add tag B
3. Click browser back button

**Expected**:
- Returns to showing only tag A selected

---

## Testing User Story 5: Combined Text and Tag Filtering

**Goal**: Verify text search + tag filters work together

**Steps**:
1. Select tag "safety"
2. Type "gpt-4" in the search box

**Expected**:
- Only runs matching BOTH criteria shown (safety tag AND contains "gpt-4")
- Results count reflects combined filter

**Clear Text Only**:
1. Clear the search text (backspace or clear button)

**Expected**:
- Tag filter remains active
- Results show all safety-tagged runs again

---

## Edge Case Testing

### Empty Tag List
1. In a fresh environment with no tags defined
2. Open tag filter dropdown

**Expected**: Shows "No tags available" message

### No Matching Runs
1. Select tags that no runs match (e.g., combine rarely-used tags)

**Expected**: Empty state message shown in run list

### Orphaned Tag Filters
1. Add a tag to URL manually: `?tags=nonexistent-id`
2. Navigate to page

**Expected**: Invalid tag ID is ignored; no errors

### Large Tag List
1. Create 50+ tags in system
2. Open tag dropdown

**Expected**: Dropdown is scrollable with reasonable max height

---

## Troubleshooting

**Issue**: Tags don't appear in dropdown
**Fix**: Check that tags exist in database and `useTags` hook is fetching correctly

**Issue**: Filtering doesn't work
**Fix**: Verify `definition.tags` is being returned in the GraphQL query

**Issue**: URL doesn't update
**Fix**: Check `useComparisonState` hook integration and URL param handling

**Issue**: Browser back doesn't restore state
**Fix**: Ensure using `setSearchParams` with correct replace/push behavior

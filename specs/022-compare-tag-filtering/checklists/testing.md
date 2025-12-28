# Testing Quality Checklist

**Purpose**: Validate test coverage and quality
**Feature**: [tasks.md](../tasks.md)

## Pre-Commit Requirements (per Constitution)

- [ ] All tests pass
  - Command: `DATABASE_URL="postgresql://valuerank:valuerank@localhost:5433/valuerank_test" JWT_SECRET="test-secret-that-is-at-least-32-characters-long" npx turbo run test`
  - Reference: Constitution § Running Tests
- [ ] Lint passes
  - Command: `npx turbo lint --force`
  - Reference: Constitution § Pre-push Hook
- [ ] Build succeeds
  - Command: `npx turbo build --force`
  - Reference: Constitution § Pre-push Hook

## Test Coverage (per Constitution)

- [ ] Line coverage ≥ 80% (target: 90%)
  - Reference: Constitution § Coverage Targets
- [ ] Branch coverage ≥ 75% (target: 85%)
- [ ] Function coverage ≥ 80% (target: 90%)
- [ ] Check coverage: `npx turbo run test:coverage`

## Test Structure (per Constitution)

- [ ] Tests use describe/it blocks
  - Reference: Constitution § Test Structure
- [ ] Test files in `tests/` directory mirroring `src/`
  - Reference: Constitution § Test Files Location
- [ ] Descriptive test names

## Component Tests

### TagFilterDropdown

- [ ] Renders with available tags
- [ ] Renders empty state when no tags
- [ ] Tag selection toggles correctly
- [ ] Badge shows correct count
- [ ] Clear tags action works
- [ ] Dropdown opens/closes correctly

### RunSelector with Tags

- [ ] Single tag filter works
- [ ] Multiple tag filter uses AND logic
- [ ] Tag filter + text search combination
- [ ] Clear tags preserves text search
- [ ] Clear text preserves tag filter
- [ ] Count updates correctly when filtered

### useComparisonState Hook

- [ ] Parses tags from URL correctly
- [ ] Handles empty tags param
- [ ] Handles invalid tag IDs gracefully
- [ ] Updates URL on tag change
- [ ] Uses replaceState (not pushState)

## Integration Tests

- [ ] End-to-end tag filter flow works
- [ ] URL sharing restores filter state
- [ ] Browser back/forward works

## Edge Case Coverage

- [ ] Empty tag list handled
- [ ] No matching runs empty state
- [ ] Orphaned tag IDs in URL
- [ ] Large tag list scrollable
- [ ] Combined filters work

## Test Isolation (per Constitution)

- [ ] Tests don't depend on each other
- [ ] Use unique test data with timestamps
- [ ] Mock external dependencies
  - Reference: Constitution § Troubleshooting Test Failures

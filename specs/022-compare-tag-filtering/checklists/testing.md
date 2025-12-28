# Testing Quality Checklist

**Purpose**: Validate test coverage and quality
**Feature**: [tasks.md](../tasks.md)

## Pre-Commit Requirements (per Constitution)

> ⏳ These items are validated after implementation is complete

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

> ⏳ These items are validated after test execution

- [ ] Line coverage ≥ 80% (target: 90%)
  - Reference: Constitution § Coverage Targets
- [ ] Branch coverage ≥ 75% (target: 85%)
- [ ] Function coverage ≥ 80% (target: 90%)
- [ ] Check coverage: `npx turbo run test:coverage`

## Test Structure (per Constitution)

- [X] Tests use describe/it blocks
  - Reference: Constitution § Test Structure
  - Plan: Testing Strategy confirms Vitest structure
- [X] Test files in `tests/` directory mirroring `src/`
  - Reference: Constitution § Test Files Location
  - Tasks: T003, T009, T012, T016, T019 specify test file locations
- [X] Descriptive test names

## Component Tests

### TagFilterDropdown

> Tasks: T003, T012

- [X] Renders with available tags
- [X] Renders empty state when no tags
- [X] Tag selection toggles correctly
- [X] Badge shows correct count
- [X] Clear tags action works
- [X] Dropdown opens/closes correctly

### RunSelector with Tags

> Tasks: T009, T019

- [X] Single tag filter works
- [X] Multiple tag filter uses AND logic
- [X] Tag filter + text search combination
- [X] Clear tags preserves text search
- [X] Clear text preserves tag filter
- [X] Count updates correctly when filtered

### useComparisonState Hook

> Task: T016

- [X] Parses tags from URL correctly
- [X] Handles empty tags param
- [X] Handles invalid tag IDs gracefully
- [X] Updates URL on tag change
- [X] Uses replaceState (not pushState)

## Integration Tests

> Tasks: T009, T016

- [X] End-to-end tag filter flow works
- [X] URL sharing restores filter state
- [X] Browser back/forward works

## Edge Case Coverage

> Tasks: T020-T023

- [X] Empty tag list handled
- [X] No matching runs empty state
- [X] Orphaned tag IDs in URL
- [X] Large tag list scrollable
- [X] Combined filters work

## Test Isolation (per Constitution)

- [X] Tests don't depend on each other
- [X] Use unique test data with timestamps
- [X] Mock external dependencies
  - Reference: Constitution § Troubleshooting Test Failures

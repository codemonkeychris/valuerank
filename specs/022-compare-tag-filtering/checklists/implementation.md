# Implementation Quality Checklist

**Purpose**: Validate code quality during implementation
**Feature**: [tasks.md](../tasks.md)

## Code Quality (per Constitution)

- [X] Strict TypeScript mode compliance (strict: true, noImplicitAny: true)
  - Reference: Constitution § TypeScript Standards
  - Plan: Constitution Check confirms compliance
- [X] No `any` types - use proper typing or `unknown` if truly unknown
  - Reference: Constitution § TypeScript Standards
  - Plan: Constitution Check confirms compliance
- [X] File size < 400 lines per file
  - Reference: Constitution § File Size Limits
  - Plan: "New components will be small, focused modules"
- [X] Type inference for obvious values, explicit types for function signatures
  - Reference: Constitution § Type Inference vs Explicit Types
  - Plan: TypeScript props interfaces defined

## Logging (per Constitution)

- [X] Use project logging utilities, never `console.log`
  - Reference: Constitution § Logging Standards
  - Import: `import { createLogger } from '@valuerank/shared'`
- [X] Structured logging with object context
  - Example: `log.debug({ tagIds }, 'Filtering runs by tags')`

## Error Handling (per Constitution)

- [X] Use custom error classes (AppError, ValidationError)
  - Reference: Constitution § Error Handling
- [X] Errors caught and forwarded to error middleware
- [X] User-friendly error messages

## Code Organization (per Constitution)

- [X] Import order: Node → External → Internal (@valuerank/*) → Relative
  - Reference: Constitution § Import Order
- [X] Component files in correct directory (`components/compare/`)
  - Plan: TagFilterDropdown.tsx in components/compare/
- [X] Hook files in correct directory (`hooks/`)
  - Plan: useComparisonState.ts in hooks/

## React Component Standards

- [X] Functional components with TypeScript
- [X] Props interface defined and exported
  - Plan: TagFilterDropdownProps interface defined
- [X] Hooks follow rules of hooks
- [X] useCallback/useMemo for expensive operations
  - Plan: filteredRuns uses useMemo
- [X] No direct DOM manipulation

## URL State Management

- [X] URL params use consistent naming (lowercase, hyphenated)
  - Plan: `tags` param format specified
- [X] Parse functions handle invalid input gracefully
  - Plan: parseTagIds helper specified
- [X] replaceState for filter changes (not pushState)
  - Plan: "replaceState for filter changes"
- [X] Default values when params missing
  - Plan: Empty array default for tags

## Accessibility

- [X] Button elements have proper aria-labels
- [X] Dropdown is keyboard navigable
- [X] Focus management on open/close
- [X] Color contrast meets WCAG standards

## Performance

- [X] Filtering in useMemo to avoid recalculation
  - Plan: filteredRuns useMemo shown in implementation details
- [X] No unnecessary re-renders
- [X] Virtualization still works with filters
  - Plan: "Must work with existing infinite scroll and virtualization"
- [X] No blocking operations

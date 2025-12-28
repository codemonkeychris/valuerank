# Implementation Quality Checklist

**Purpose**: Validate code quality during implementation
**Feature**: [tasks.md](../tasks.md)

## Code Quality (per Constitution)

- [ ] Strict TypeScript mode compliance (strict: true, noImplicitAny: true)
  - Reference: Constitution § TypeScript Standards
- [ ] No `any` types - use proper typing or `unknown` if truly unknown
  - Reference: Constitution § TypeScript Standards
- [ ] File size < 400 lines per file
  - Reference: Constitution § File Size Limits
- [ ] Type inference for obvious values, explicit types for function signatures
  - Reference: Constitution § Type Inference vs Explicit Types

## Logging (per Constitution)

- [ ] Use project logging utilities, never `console.log`
  - Reference: Constitution § Logging Standards
  - Import: `import { createLogger } from '@valuerank/shared'`
- [ ] Structured logging with object context
  - Example: `log.debug({ tagIds }, 'Filtering runs by tags')`

## Error Handling (per Constitution)

- [ ] Use custom error classes (AppError, ValidationError)
  - Reference: Constitution § Error Handling
- [ ] Errors caught and forwarded to error middleware
- [ ] User-friendly error messages

## Code Organization (per Constitution)

- [ ] Import order: Node → External → Internal (@valuerank/*) → Relative
  - Reference: Constitution § Import Order
- [ ] Component files in correct directory (`components/compare/`)
- [ ] Hook files in correct directory (`hooks/`)

## React Component Standards

- [ ] Functional components with TypeScript
- [ ] Props interface defined and exported
- [ ] Hooks follow rules of hooks
- [ ] useCallback/useMemo for expensive operations
- [ ] No direct DOM manipulation

## URL State Management

- [ ] URL params use consistent naming (lowercase, hyphenated)
- [ ] Parse functions handle invalid input gracefully
- [ ] replaceState for filter changes (not pushState)
- [ ] Default values when params missing

## Accessibility

- [ ] Button elements have proper aria-labels
- [ ] Dropdown is keyboard navigable
- [ ] Focus management on open/close
- [ ] Color contrast meets WCAG standards

## Performance

- [ ] Filtering in useMemo to avoid recalculation
- [ ] No unnecessary re-renders
- [ ] Virtualization still works with filters
- [ ] No blocking operations

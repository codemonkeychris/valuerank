# Implementation Quality Checklist

**Purpose**: Validate code quality during implementation
**Feature**: [tasks.md](../tasks.md)

## Code Quality (per constitution)

### File Size Limits
- [ ] All React components < 400 lines
  - Reference: Constitution § File Size Limits
  - If larger: Extract hooks/subcomponents
- [ ] All hooks < 400 lines
- [ ] All utility files < 400 lines
- [ ] Split into folder with index.ts if needed

### TypeScript Standards
- [ ] No `any` types used
  - Reference: Constitution § TypeScript Standards
  - Use `unknown` if type is truly unknown
- [ ] Strict mode enabled (project-wide)
- [ ] All function signatures explicitly typed
- [ ] All exported interfaces/types defined
- [ ] Prefer `type` over `interface` for data shapes

### Type Safety Specifics
- [ ] ComparisonConfig type fully defined
- [ ] VisualizationRegistration type complete
- [ ] RunWithAnalysis type matches GraphQL schema
- [ ] ComparisonStatistics type has all fields

## Logging (per constitution)

- [ ] No `console.log` statements in production code
  - Reference: Constitution § Logging Standards
- [ ] Use `createLogger` from `@valuerank/shared` if needed
- [ ] Structured logging with context objects

## URL Construction

- [ ] No hardcoded URLs in frontend code
- [ ] Use react-router-dom's useSearchParams
- [ ] URL parameters validated before use
- [ ] Invalid parameters handled gracefully

## Code Organization (per constitution)

### Import Order
- [ ] External packages first (react, recharts, urql)
- [ ] Internal packages second (@valuerank/shared)
- [ ] Relative imports last (./types, ../hooks)
  - Reference: Constitution § Code Organization

### Folder Structure
- [ ] Components in `components/compare/`
- [ ] Visualizations in `components/compare/visualizations/`
- [ ] Hooks in `hooks/`
- [ ] Types co-located or in dedicated types.ts
- [ ] GraphQL operations in `api/operations/`

## Error Handling

- [ ] GraphQL errors handled in hooks
- [ ] Loading states shown to user
- [ ] Invalid URL parameters don't crash app
- [ ] Missing analysis data handled per visualization

## Component Patterns

### React Best Practices
- [ ] Functional components with hooks
- [ ] useMemo for expensive computations (statistical calcs)
- [ ] useCallback for event handlers passed to children
- [ ] Props destructured in function signature

### Visualization Components
- [ ] All receive standardized props (ComparisonVisualizationProps)
- [ ] Handle empty/null data gracefully
- [ ] Responsive design (ResponsiveContainer for Recharts)
- [ ] Accessible (proper aria labels, color contrast)

## GraphQL Integration

- [ ] Query uses fragment for reusability
- [ ] Variables properly typed
- [ ] Cache policy appropriate (cache-and-network)
- [ ] Error state exposed to components

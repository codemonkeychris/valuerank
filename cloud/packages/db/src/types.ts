/**
 * JSONB content types for database fields.
 * All types include schema_version for read-time migration.
 */

// ============================================================================
// DEFINITION CONTENT
// ============================================================================

export type Dimension = {
  name: string;
  values: string[];
  description?: string;
};

export type DefinitionContent = {
  schema_version: 1;
  preamble: string;
  template: string;
  dimensions: Dimension[];
  matching_rules?: string;
};

export type DefinitionContentV0 = {
  preamble: string;
  template: string;
  dimensions: Dimension[];
  matching_rules?: string;
};

// ============================================================================
// RUN CONFIG & PROGRESS
// ============================================================================

export type RunConfig = {
  schema_version: 1;
  models: string[];
  temperature?: number;
  sample_percentage?: number;
};

export type RunProgress = {
  total: number;
  completed: number;
  failed: number;
};

// ============================================================================
// SCENARIO CONTENT
// ============================================================================

export type ScenarioContent = {
  schema_version: 1;
  prompt: string;
  dimension_values: Record<string, string>;
  expected_values?: string[];
};

// ============================================================================
// TRANSCRIPT CONTENT
// ============================================================================

export type TranscriptMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
};

export type TranscriptContent = {
  schema_version: 1;
  messages: TranscriptMessage[];
  model_response?: string;
  raw_output?: string;
};

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

export type AnalysisPlan = {
  schema_version: 1;
  test: string;
  alpha: number;
  correction?: string;
};

export type AnalysisOutput = {
  schema_version: 1;
  results: Record<string, unknown>;
  summary?: string;
  confidence_intervals?: Record<string, { lower: number; upper: number }>;
};

// ============================================================================
// COMPARISON DELTA
// ============================================================================

export type DeltaData = {
  schema_version: 1;
  value_differences: Record<string, { baseline: number; comparison: number; delta: number }>;
  statistical_tests?: Record<string, { p_value: number; significant: boolean }>;
};

// ============================================================================
// RUBRIC CONTENT
// ============================================================================

export type RubricValue = {
  name: string;
  definition: string;
  examples?: string[];
};

export type RubricContent = {
  schema_version: 1;
  values: RubricValue[];
};

// ============================================================================
// COHORT CRITERIA
// ============================================================================

export type CohortCriteria = {
  schema_version: 1;
  filters: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'in' | 'contains' | 'gt' | 'lt';
    value: unknown;
  }>;
};

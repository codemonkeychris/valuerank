/**
 * Read-time JSONB schema migration utilities.
 *
 * Strategy: All JSONB content includes a schema_version field.
 * When reading, we check the version and migrate if needed.
 * This allows zero-downtime schema evolution.
 */

import type {
  DefinitionContent,
  DefinitionContentV0,
  RunConfig,
  ScenarioContent,
  TranscriptContent,
  AnalysisOutput,
  RubricContent,
  CohortCriteria,
} from './types.js';

// ============================================================================
// VERSION CONSTANTS
// ============================================================================

export const CURRENT_DEFINITION_VERSION = 1;
export const CURRENT_RUN_CONFIG_VERSION = 1;
export const CURRENT_SCENARIO_VERSION = 1;
export const CURRENT_TRANSCRIPT_VERSION = 1;
export const CURRENT_ANALYSIS_VERSION = 1;
export const CURRENT_RUBRIC_VERSION = 1;
export const CURRENT_COHORT_VERSION = 1;

// ============================================================================
// DEFINITION CONTENT MIGRATIONS
// ============================================================================

function migrateDefinitionV0toV1(data: DefinitionContentV0): DefinitionContent {
  return {
    schema_version: 1,
    preamble: data.preamble ?? '',
    template: data.template ?? '',
    dimensions: data.dimensions ?? [],
    matching_rules: data.matching_rules,
  };
}

/**
 * Load and migrate definition content to current version.
 * @throws Error if schema_version is unknown/unsupported
 */
export function loadDefinitionContent(raw: unknown): DefinitionContent {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Definition content must be an object');
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data.schema_version === 'number' ? data.schema_version : 0;

  switch (version) {
    case 0:
      return migrateDefinitionV0toV1(data as unknown as DefinitionContentV0);
    case 1:
      return data as unknown as DefinitionContent;
    default:
      throw new Error(`Unknown definition content schema version: ${version}`);
  }
}

// ============================================================================
// RUN CONFIG MIGRATIONS
// ============================================================================

/**
 * Load and migrate run config to current version.
 */
export function loadRunConfig(raw: unknown): RunConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Run config must be an object');
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data.schema_version === 'number' ? data.schema_version : 0;

  switch (version) {
    case 0:
      // V0 had no schema_version, add it
      return {
        schema_version: 1,
        models: Array.isArray(data.models) ? data.models as string[] : [],
        temperature: typeof data.temperature === 'number' ? data.temperature : undefined,
        sample_percentage: typeof data.sample_percentage === 'number' ? data.sample_percentage : undefined,
      };
    case 1:
      return data as unknown as RunConfig;
    default:
      throw new Error(`Unknown run config schema version: ${version}`);
  }
}

// ============================================================================
// SCENARIO CONTENT MIGRATIONS
// ============================================================================

/**
 * Load and migrate scenario content to current version.
 */
export function loadScenarioContent(raw: unknown): ScenarioContent {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Scenario content must be an object');
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data.schema_version === 'number' ? data.schema_version : 0;

  switch (version) {
    case 0:
      return {
        schema_version: 1,
        prompt: typeof data.prompt === 'string' ? data.prompt : '',
        dimension_values: (data.dimension_values ?? {}) as Record<string, string>,
        expected_values: Array.isArray(data.expected_values) ? data.expected_values as string[] : undefined,
      };
    case 1:
      return data as unknown as ScenarioContent;
    default:
      throw new Error(`Unknown scenario content schema version: ${version}`);
  }
}

// ============================================================================
// TRANSCRIPT CONTENT MIGRATIONS
// ============================================================================

/**
 * Load and migrate transcript content to current version.
 */
export function loadTranscriptContent(raw: unknown): TranscriptContent {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Transcript content must be an object');
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data.schema_version === 'number' ? data.schema_version : 0;

  switch (version) {
    case 0:
      return {
        schema_version: 1,
        messages: Array.isArray(data.messages) ? data.messages as TranscriptContent['messages'] : [],
        model_response: typeof data.model_response === 'string' ? data.model_response : undefined,
        raw_output: typeof data.raw_output === 'string' ? data.raw_output : undefined,
      };
    case 1:
      return data as unknown as TranscriptContent;
    default:
      throw new Error(`Unknown transcript content schema version: ${version}`);
  }
}

// ============================================================================
// ANALYSIS OUTPUT MIGRATIONS
// ============================================================================

/**
 * Load and migrate analysis output to current version.
 */
export function loadAnalysisOutput(raw: unknown): AnalysisOutput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Analysis output must be an object');
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data.schema_version === 'number' ? data.schema_version : 0;

  switch (version) {
    case 0:
      return {
        schema_version: 1,
        results: (data.results ?? data) as Record<string, unknown>,
        summary: typeof data.summary === 'string' ? data.summary : undefined,
      };
    case 1:
      return data as unknown as AnalysisOutput;
    default:
      throw new Error(`Unknown analysis output schema version: ${version}`);
  }
}

// ============================================================================
// RUBRIC CONTENT MIGRATIONS
// ============================================================================

/**
 * Load and migrate rubric content to current version.
 */
export function loadRubricContent(raw: unknown): RubricContent {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Rubric content must be an object');
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data.schema_version === 'number' ? data.schema_version : 0;

  switch (version) {
    case 0:
      return {
        schema_version: 1,
        values: Array.isArray(data.values) ? data.values as RubricContent['values'] : [],
      };
    case 1:
      return data as unknown as RubricContent;
    default:
      throw new Error(`Unknown rubric content schema version: ${version}`);
  }
}

// ============================================================================
// COHORT CRITERIA MIGRATIONS
// ============================================================================

/**
 * Load and migrate cohort criteria to current version.
 */
export function loadCohortCriteria(raw: unknown): CohortCriteria {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cohort criteria must be an object');
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data.schema_version === 'number' ? data.schema_version : 0;

  switch (version) {
    case 0:
      return {
        schema_version: 1,
        filters: Array.isArray(data.filters) ? data.filters as CohortCriteria['filters'] : [],
      };
    case 1:
      return data as unknown as CohortCriteria;
    default:
      throw new Error(`Unknown cohort criteria schema version: ${version}`);
  }
}

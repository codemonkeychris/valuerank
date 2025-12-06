/**
 * Tests for JSONB schema migration utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  loadDefinitionContent,
  loadRunConfig,
  loadScenarioContent,
  loadTranscriptContent,
  loadAnalysisOutput,
  loadRubricContent,
  loadCohortCriteria,
} from '../src/schema-migration.js';
import type { DefinitionContent, RunConfig } from '../src/types.js';

describe('Schema Migration', () => {
  describe('loadDefinitionContent', () => {
    it('migrates v0 content (no schema_version) to v1', () => {
      const v0Content = {
        preamble: 'Test preamble',
        template: 'Test template',
        dimensions: [{ name: 'test', values: ['a', 'b'] }],
      };

      const result = loadDefinitionContent(v0Content);

      expect(result.schema_version).toBe(1);
      expect(result.preamble).toBe('Test preamble');
      expect(result.template).toBe('Test template');
      expect(result.dimensions).toHaveLength(1);
    });

    it('passes through v1 content unchanged', () => {
      const v1Content: DefinitionContent = {
        schema_version: 1,
        preamble: 'V1 preamble',
        template: 'V1 template',
        dimensions: [],
        matching_rules: 'some rules',
      };

      const result = loadDefinitionContent(v1Content);

      expect(result).toEqual(v1Content);
    });

    it('handles missing fields in v0 content', () => {
      const incompleteV0 = {};

      const result = loadDefinitionContent(incompleteV0);

      expect(result.schema_version).toBe(1);
      expect(result.preamble).toBe('');
      expect(result.template).toBe('');
      expect(result.dimensions).toEqual([]);
    });

    it('throws on unknown schema version', () => {
      const unknownVersion = { schema_version: 99 };

      expect(() => loadDefinitionContent(unknownVersion)).toThrow(
        'Unknown definition content schema version: 99'
      );
    });

    it('throws on non-object input', () => {
      expect(() => loadDefinitionContent(null)).toThrow(
        'Definition content must be an object'
      );
      expect(() => loadDefinitionContent('string')).toThrow(
        'Definition content must be an object'
      );
    });
  });

  describe('loadRunConfig', () => {
    it('migrates v0 config (no schema_version) to v1', () => {
      const v0Config = {
        models: ['gpt-4', 'claude-3'],
        temperature: 0.7,
      };

      const result = loadRunConfig(v0Config);

      expect(result.schema_version).toBe(1);
      expect(result.models).toEqual(['gpt-4', 'claude-3']);
      expect(result.temperature).toBe(0.7);
    });

    it('passes through v1 config unchanged', () => {
      const v1Config: RunConfig = {
        schema_version: 1,
        models: ['claude-3'],
        sample_percentage: 50,
      };

      const result = loadRunConfig(v1Config);

      expect(result).toEqual(v1Config);
    });

    it('handles missing models array', () => {
      const noModels = {};

      const result = loadRunConfig(noModels);

      expect(result.schema_version).toBe(1);
      expect(result.models).toEqual([]);
    });

    it('throws on unknown schema version', () => {
      const unknownVersion = { schema_version: 99 };

      expect(() => loadRunConfig(unknownVersion)).toThrow(
        'Unknown run config schema version: 99'
      );
    });
  });

  describe('loadScenarioContent', () => {
    it('migrates v0 content to v1', () => {
      const v0Content = {
        prompt: 'Test prompt',
        dimension_values: { severity: 'high' },
      };

      const result = loadScenarioContent(v0Content);

      expect(result.schema_version).toBe(1);
      expect(result.prompt).toBe('Test prompt');
      expect(result.dimension_values).toEqual({ severity: 'high' });
    });

    it('handles missing prompt', () => {
      const noPrompt = {};

      const result = loadScenarioContent(noPrompt);

      expect(result.prompt).toBe('');
    });

    it('throws on unknown schema version', () => {
      expect(() => loadScenarioContent({ schema_version: 99 })).toThrow(
        'Unknown scenario content schema version: 99'
      );
    });
  });

  describe('loadTranscriptContent', () => {
    it('migrates v0 content to v1', () => {
      const v0Content = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
        model_response: 'Final response',
      };

      const result = loadTranscriptContent(v0Content);

      expect(result.schema_version).toBe(1);
      expect(result.messages).toHaveLength(2);
      expect(result.model_response).toBe('Final response');
    });

    it('handles missing messages', () => {
      const noMessages = {};

      const result = loadTranscriptContent(noMessages);

      expect(result.messages).toEqual([]);
    });

    it('throws on unknown schema version', () => {
      expect(() => loadTranscriptContent({ schema_version: 99 })).toThrow(
        'Unknown transcript content schema version: 99'
      );
    });
  });

  describe('loadAnalysisOutput', () => {
    it('migrates v0 output to v1', () => {
      const v0Output = {
        results: { value1: 0.5 },
        summary: 'Test summary',
      };

      const result = loadAnalysisOutput(v0Output);

      expect(result.schema_version).toBe(1);
      expect(result.results).toEqual({ value1: 0.5 });
      expect(result.summary).toBe('Test summary');
    });

    it('wraps raw results object as v0', () => {
      const rawResults = { value1: 0.5, value2: 0.7 };

      const result = loadAnalysisOutput(rawResults);

      expect(result.schema_version).toBe(1);
      expect(result.results).toEqual({ value1: 0.5, value2: 0.7 });
    });

    it('throws on unknown schema version', () => {
      expect(() => loadAnalysisOutput({ schema_version: 99 })).toThrow(
        'Unknown analysis output schema version: 99'
      );
    });
  });

  describe('loadRubricContent', () => {
    it('migrates v0 content to v1', () => {
      const v0Content = {
        values: [{ name: 'Safety', definition: 'Physical safety' }],
      };

      const result = loadRubricContent(v0Content);

      expect(result.schema_version).toBe(1);
      expect(result.values).toHaveLength(1);
    });

    it('handles missing values array', () => {
      const noValues = {};

      const result = loadRubricContent(noValues);

      expect(result.values).toEqual([]);
    });

    it('throws on unknown schema version', () => {
      expect(() => loadRubricContent({ schema_version: 99 })).toThrow(
        'Unknown rubric content schema version: 99'
      );
    });
  });

  describe('loadCohortCriteria', () => {
    it('migrates v0 criteria to v1', () => {
      const v0Criteria = {
        filters: [{ field: 'model', operator: 'eq', value: 'gpt-4' }],
      };

      const result = loadCohortCriteria(v0Criteria);

      expect(result.schema_version).toBe(1);
      expect(result.filters).toHaveLength(1);
    });

    it('handles missing filters array', () => {
      const noFilters = {};

      const result = loadCohortCriteria(noFilters);

      expect(result.filters).toEqual([]);
    });

    it('throws on unknown schema version', () => {
      expect(() => loadCohortCriteria({ schema_version: 99 })).toThrow(
        'Unknown cohort criteria schema version: 99'
      );
    });
  });
});

/**
 * get_dimension_analysis Tool Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@valuerank/db';
import { formatDimensionAnalysis } from '../../../src/mcp/tools/get-dimension-analysis.js';

describe('get_dimension_analysis tool', () => {
  let testDefinitionId: string;
  let testRunId: string;
  let testAnalysisId: string;

  beforeAll(async () => {
    // Create test definition
    const definition = await db.definition.create({
      data: {
        name: 'test-mcp-dimension-analysis-definition',
        content: { scenario: 'test' },
      },
    });
    testDefinitionId = definition.id;

    // Create test run
    const run = await db.run.create({
      data: {
        definitionId: testDefinitionId,
        status: 'COMPLETED',
        config: { models: ['gpt-4', 'claude-3'], samplePercentage: 100 },
      },
    });
    testRunId = run.id;

    // Create analysis result with dimension data (matching Python worker output)
    const analysis = await db.analysisResult.create({
      data: {
        runId: testRunId,
        analysisType: 'basic',
        inputHash: 'test-hash',
        codeVersion: '1.0.0',
        status: 'CURRENT',
        output: {
          dimensionAnalysis: {
            dimensions: {
              safety: { effectSize: 0.85, pValue: 0.001, significant: true, rank: 1 },
              ethics: { effectSize: 0.72, pValue: 0.01, significant: true, rank: 2 },
              capability: { effectSize: 0.65, pValue: 0.05, significant: true, rank: 3 },
            },
            varianceExplained: 0.42,
            method: 'kruskal_wallis',
          },
        },
      },
    });
    testAnalysisId = analysis.id;
  });

  afterAll(async () => {
    // Clean up
    if (testAnalysisId) {
      await db.analysisResult.delete({ where: { id: testAnalysisId } });
    }
    if (testRunId) {
      await db.run.delete({ where: { id: testRunId } });
    }
    if (testDefinitionId) {
      await db.definition.delete({ where: { id: testDefinitionId } });
    }
  });

  describe('formatDimensionAnalysis', () => {
    it('formats analysis with dimension data correctly', async () => {
      const analysis = await db.analysisResult.findUnique({
        where: { id: testAnalysisId },
      });

      const result = formatDimensionAnalysis(testRunId, analysis);

      expect(result.runId).toBe(testRunId);
      expect(result.analysisStatus).toBe('completed');
      expect(result.rankedDimensions.length).toBe(3);
      expect(result.varianceExplained).toBe(0.42);
      expect(result.method).toBe('kruskal_wallis');
    });

    it('includes correct ranked dimensions sorted by rank', async () => {
      const analysis = await db.analysisResult.findUnique({
        where: { id: testAnalysisId },
      });

      const result = formatDimensionAnalysis(testRunId, analysis);

      expect(result.rankedDimensions[0].dimension).toBe('safety');
      expect(result.rankedDimensions[0].effectSize).toBe(0.85);
      expect(result.rankedDimensions[0].pValue).toBe(0.001);
      expect(result.rankedDimensions[0].significant).toBe(true);
      expect(result.rankedDimensions[0].rank).toBe(1);

      // Verify sorting by rank
      expect(result.rankedDimensions[1].dimension).toBe('ethics');
      expect(result.rankedDimensions[2].dimension).toBe('capability');
    });

    it('returns pending status when no analysis', () => {
      const result = formatDimensionAnalysis(testRunId, null);

      expect(result.analysisStatus).toBe('pending');
      expect(result.rankedDimensions).toEqual([]);
      expect(result.varianceExplained).toBe(0);
      expect(result.method).toBe('unknown');
    });

    it('truncates large dimension lists', () => {
      const manyDimensions: Record<string, { effectSize: number; pValue: number; significant: boolean; rank: number }> = {};
      for (let i = 0; i < 20; i++) {
        manyDimensions[`dim-${i}`] = {
          effectSize: 0.5 - i * 0.02,
          pValue: 0.05,
          significant: true,
          rank: i + 1,
        };
      }

      const mockAnalysis = {
        status: 'CURRENT',
        output: {
          dimensionAnalysis: {
            dimensions: manyDimensions,
            varianceExplained: 0.6,
            method: 'kruskal_wallis',
          },
        },
      };

      const result = formatDimensionAnalysis(testRunId, mockAnalysis);

      // Should be truncated to 10
      expect(result.rankedDimensions.length).toBe(10);
    });

    it('handles empty dimensions object', () => {
      const mockAnalysis = {
        status: 'CURRENT',
        output: {
          dimensionAnalysis: {
            dimensions: {},
            varianceExplained: 0,
            method: 'kruskal_wallis',
          },
        },
      };

      const result = formatDimensionAnalysis(testRunId, mockAnalysis);

      expect(result.rankedDimensions).toEqual([]);
      expect(result.varianceExplained).toBe(0);
    });
  });
});

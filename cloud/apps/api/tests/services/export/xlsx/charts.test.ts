/**
 * Charts Test Suite
 *
 * Tests for xlsx chart builder functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';

import { buildChartsSheet, buildSimpleChartsSheet } from '../../../../src/services/export/xlsx/charts.js';
import type { ModelStatistics } from '../../../../src/services/export/xlsx/types.js';
import { createWorkbook } from '../../../../src/services/export/xlsx/workbook.js';

// ============================================================================
// TEST DATA
// ============================================================================

function createMockModelStats(count: number = 3): ModelStatistics[] {
  const models = ['claude-3-5-sonnet', 'gpt-4o', 'gemini-pro'];
  return models.slice(0, count).map((name, i) => ({
    modelName: name,
    sampleCount: 50,
    meanScore: 2.5 + i * 0.5,
    stdDev: 0.8,
    decisionDistribution: {
      '1': 5,
      '2': 10,
      '3': 20,
      '4': 10,
      '5': 5,
    },
  }));
}

// ============================================================================
// BUILD CHARTS SHEET TESTS (ASYNC WITH NATIVE CHART)
// ============================================================================

describe('buildChartsSheet', () => {
  let workbook: ExcelJS.Workbook;

  beforeEach(() => {
    workbook = createWorkbook('test-run');
  });

  it('creates a worksheet named "Charts"', async () => {
    const stats = createMockModelStats();
    await buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    expect(worksheet).toBeDefined();
  });

  it('includes title in worksheet', async () => {
    const stats = createMockModelStats();
    await buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundTitle = false;

    worksheet!.eachRow((row) => {
      const cellValue = row.getCell(1).value;
      if (typeof cellValue === 'string' && cellValue.includes('Decision Distribution')) {
        foundTitle = true;
      }
    });

    expect(foundTitle).toBe(true);
  });

  it('includes model names in data table', async () => {
    const stats = createMockModelStats(2);
    await buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundModels = 0;

    worksheet!.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === 'claude-3-5-sonnet' || cell.value === 'gpt-4o') {
          foundModels++;
        }
      });
    });

    expect(foundModels).toBeGreaterThan(0);
  });

  it('includes decision code headers', async () => {
    const stats = createMockModelStats();
    await buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundScoreHeaders = 0;

    worksheet!.eachRow((row) => {
      row.eachCell((cell) => {
        const value = cell.value;
        if (typeof value === 'string' && value.startsWith('Score ')) {
          foundScoreHeaders++;
        }
      });
    });

    // Should have Score 1, Score 2, Score 3, Score 4, Score 5
    expect(foundScoreHeaders).toBe(5);
  });

  it('returns a buffer for native chart', async () => {
    const stats = createMockModelStats();
    const result = await buildChartsSheet(workbook, stats);

    // Returns Buffer or null depending on xlsx-chart availability
    expect(result === null || Buffer.isBuffer(result)).toBe(true);
  });

  it('handles empty model statistics by returning null', async () => {
    const result = await buildChartsSheet(workbook, []);
    expect(result).toBe(null);
  });

  it('handles stats with no numeric decision codes', async () => {
    const stats: ModelStatistics[] = [
      {
        modelName: 'test-model',
        sampleCount: 10,
        meanScore: 0,
        stdDev: 0,
        decisionDistribution: {
          error: 5,
          unknown: 5,
        },
      },
    ];

    const result = await buildChartsSheet(workbook, stats);
    expect(result).toBe(null);
  });
});

// ============================================================================
// BUILD SIMPLE CHARTS SHEET TESTS (FALLBACK)
// ============================================================================

describe('buildSimpleChartsSheet', () => {
  let workbook: ExcelJS.Workbook;

  beforeEach(() => {
    workbook = createWorkbook('test-run');
  });

  it('creates a worksheet named "Charts"', () => {
    const stats = createMockModelStats();
    buildSimpleChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    expect(worksheet).toBeDefined();
  });

  it('includes title', () => {
    const stats = createMockModelStats();
    buildSimpleChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundTitle = false;

    worksheet!.eachRow((row) => {
      const cellValue = row.getCell(1).value;
      if (typeof cellValue === 'string' && cellValue.includes('Decision Distribution')) {
        foundTitle = true;
      }
    });

    expect(foundTitle).toBe(true);
  });

  it('includes model names in data', () => {
    const stats = createMockModelStats(2);
    buildSimpleChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundModels = 0;

    worksheet!.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === 'claude-3-5-sonnet' || cell.value === 'gpt-4o') {
          foundModels++;
        }
      });
    });

    expect(foundModels).toBeGreaterThan(0);
  });

  it('includes score headers', () => {
    const stats = createMockModelStats();
    buildSimpleChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundHeaders = 0;

    worksheet!.eachRow((row) => {
      row.eachCell((cell) => {
        const value = cell.value;
        if (typeof value === 'string' && value.startsWith('Score ')) {
          foundHeaders++;
        }
      });
    });

    expect(foundHeaders).toBe(5);
  });

  it('includes total column', () => {
    const stats = createMockModelStats();
    buildSimpleChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundTotal = false;

    worksheet!.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === 'Total') {
          foundTotal = true;
        }
      });
    });

    expect(foundTotal).toBe(true);
  });

  it('includes instructions for creating chart', () => {
    const stats = createMockModelStats();
    buildSimpleChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundInstructions = false;

    worksheet!.eachRow((row) => {
      const cellValue = row.getCell(1).value;
      if (typeof cellValue === 'string' && cellValue.includes('To create a chart')) {
        foundInstructions = true;
      }
    });

    expect(foundInstructions).toBe(true);
  });

  it('handles empty model statistics', () => {
    buildSimpleChartsSheet(workbook, []);

    const worksheet = workbook.getWorksheet('Charts');
    expect(worksheet).toBeDefined();
  });

  it('handles stats with no numeric decision codes', () => {
    const stats: ModelStatistics[] = [
      {
        modelName: 'test-model',
        sampleCount: 10,
        meanScore: 0,
        stdDev: 0,
        decisionDistribution: {
          error: 5,
          unknown: 5,
        },
      },
    ];

    buildSimpleChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundNoCodesMessage = false;

    worksheet!.eachRow((row) => {
      const cellValue = row.getCell(1).value;
      if (typeof cellValue === 'string' && cellValue.includes('No numeric decision codes')) {
        foundNoCodesMessage = true;
      }
    });

    expect(foundNoCodesMessage).toBe(true);
  });
});

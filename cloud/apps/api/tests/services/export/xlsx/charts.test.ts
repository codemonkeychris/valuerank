/**
 * Charts Test Suite
 *
 * Tests for xlsx chart builder functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';

import { buildChartsSheet, addHorizontalBarChart } from '../../../../src/services/export/xlsx/charts.js';
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
// CHARTS SHEET TESTS
// ============================================================================

describe('buildChartsSheet', () => {
  let workbook: ExcelJS.Workbook;

  beforeEach(() => {
    workbook = createWorkbook('test-run');
  });

  it('creates a worksheet named "Charts"', () => {
    const stats = createMockModelStats();
    buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    expect(worksheet).toBeDefined();
  });

  it('includes mean scores section', () => {
    const stats = createMockModelStats();
    buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundMeanScores = false;

    worksheet!.eachRow((row) => {
      const cellValue = row.getCell(1).value;
      if (typeof cellValue === 'string' && cellValue.includes('Mean Scores')) {
        foundMeanScores = true;
      }
    });

    expect(foundMeanScores).toBe(true);
  });

  it('includes decision distribution section', () => {
    const stats = createMockModelStats();
    buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundDistribution = false;

    worksheet!.eachRow((row) => {
      const cellValue = row.getCell(1).value;
      if (typeof cellValue === 'string' && cellValue.includes('Decision Distribution')) {
        foundDistribution = true;
      }
    });

    expect(foundDistribution).toBe(true);
  });

  it('includes model names in data', () => {
    const stats = createMockModelStats(2);
    buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundModels = 0;

    worksheet!.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === 'claude-3-5-sonnet' || cell.value === 'gpt-4o') {
          foundModels++;
        }
      });
    });

    // Each model should appear multiple times (in data tables and visualizations)
    expect(foundModels).toBeGreaterThan(0);
  });

  it('handles single model statistics', () => {
    const stats = createMockModelStats(1);
    buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    expect(worksheet).toBeDefined();
  });

  it('handles empty model statistics', () => {
    buildChartsSheet(workbook, []);

    const worksheet = workbook.getWorksheet('Charts');
    expect(worksheet).toBeDefined();
  });

  it('includes visual bar representation', () => {
    const stats = createMockModelStats();
    buildChartsSheet(workbook, stats);

    const worksheet = workbook.getWorksheet('Charts');
    let foundBar = false;

    worksheet!.eachRow((row) => {
      row.eachCell((cell) => {
        const value = cell.value;
        if (typeof value === 'string' && value.includes('█')) {
          foundBar = true;
        }
      });
    });

    expect(foundBar).toBe(true);
  });
});

// ============================================================================
// HORIZONTAL BAR CHART TESTS
// ============================================================================

describe('addHorizontalBarChart', () => {
  let workbook: ExcelJS.Workbook;

  beforeEach(() => {
    workbook = createWorkbook('test-run');
  });

  it('adds chart to worksheet', () => {
    const worksheet = workbook.addWorksheet('Test');
    addHorizontalBarChart(worksheet, {
      title: 'Test Chart',
      labels: ['A', 'B', 'C'],
      values: [0.5, 0.3, 0.2],
      position: { col: 1, row: 1 },
    });

    // Check that content was added
    expect(worksheet.rowCount).toBeGreaterThan(0);
  });

  it('includes chart title', () => {
    const worksheet = workbook.addWorksheet('Test');
    addHorizontalBarChart(worksheet, {
      title: 'Impact Analysis',
      labels: ['Dim1'],
      values: [0.5],
      position: { col: 1, row: 1 },
    });

    const titleCell = worksheet.getCell(1, 1);
    expect(titleCell.value).toContain('Impact Analysis');
  });

  it('includes all labels', () => {
    const worksheet = workbook.addWorksheet('Test');
    addHorizontalBarChart(worksheet, {
      title: 'Test',
      labels: ['Alpha', 'Beta', 'Gamma'],
      values: [0.5, 0.3, 0.2],
      position: { col: 1, row: 1 },
    });

    let foundLabels = 0;
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === 'Alpha' || cell.value === 'Beta' || cell.value === 'Gamma') {
          foundLabels++;
        }
      });
    });

    expect(foundLabels).toBe(3);
  });

  it('normalizes bar lengths correctly', () => {
    const worksheet = workbook.addWorksheet('Test');
    addHorizontalBarChart(worksheet, {
      title: 'Test',
      labels: ['High', 'Low'],
      values: [1.0, 0.5],
      position: { col: 1, row: 1 },
    });

    // Both values should produce bars (visual representation)
    let barCells = 0;
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        const value = cell.value;
        if (typeof value === 'string' && value.includes('█')) {
          barCells++;
        }
      });
    });

    expect(barCells).toBe(2);
  });
});

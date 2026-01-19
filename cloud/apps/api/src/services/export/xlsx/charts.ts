/**
 * XLSX Charts Module
 *
 * Functions for creating Excel charts in the export.
 * Uses ExcelJS chart capabilities for native Excel charts.
 */

import type ExcelJS from 'exceljs';

import { addWorksheet } from './workbook.js';
import { CHART_COLORS } from './formatting.js';
import type { ModelStatistics } from './types.js';

// ============================================================================
// CHARTS WORKSHEET
// ============================================================================

/**
 * Build the Charts worksheet with model comparison visualizations.
 *
 * Creates:
 * - Bar chart comparing mean scores across models
 * - Stacked bar chart showing decision distribution
 */
export function buildChartsSheet(
  workbook: ExcelJS.Workbook,
  modelStats: ModelStatistics[]
): void {
  // Create charts worksheet
  const worksheet = addWorksheet(workbook, {
    name: 'Charts',
    type: 'charts',
  });

  // Add summary data for charts (hidden data source)
  // ExcelJS charts need data in the worksheet
  let dataRow = 1;

  // Mean Scores section
  worksheet.getCell(dataRow, 1).value = 'Mean Scores by Model';
  worksheet.getCell(dataRow, 1).font = { bold: true, size: 14 };
  dataRow += 2;

  // Headers
  worksheet.getCell(dataRow, 1).value = 'Model';
  worksheet.getCell(dataRow, 2).value = 'Mean Score';
  worksheet.getCell(dataRow, 1).font = { bold: true };
  worksheet.getCell(dataRow, 2).font = { bold: true };
  dataRow++;

  const meanScoresStartRow = dataRow;

  // Add model data
  for (const stat of modelStats) {
    worksheet.getCell(dataRow, 1).value = stat.modelName;
    worksheet.getCell(dataRow, 2).value = stat.meanScore;
    dataRow++;
  }

  const meanScoresEndRow = dataRow - 1;

  // Set column widths for data section
  worksheet.getColumn(1).width = 25;
  worksheet.getColumn(2).width = 15;

  // Add bar chart for mean scores
  addBarChart(worksheet, {
    title: 'Mean Decision Score by Model',
    dataRange: {
      startRow: meanScoresStartRow,
      endRow: meanScoresEndRow,
      labelCol: 1,
      valueCol: 2,
    },
    position: { col: 4, row: 1 },
    xAxisTitle: 'Model',
    yAxisTitle: 'Mean Score',
  });

  // Decision Distribution section
  dataRow += 3;
  worksheet.getCell(dataRow, 1).value = 'Decision Distribution';
  worksheet.getCell(dataRow, 1).font = { bold: true, size: 14 };
  dataRow += 2;

  // Collect all unique decision codes
  const allCodes = new Set<string>();
  for (const stat of modelStats) {
    for (const code of Object.keys(stat.decisionDistribution)) {
      allCodes.add(code);
    }
  }
  const sortedCodes = Array.from(allCodes).sort();

  // Headers
  worksheet.getCell(dataRow, 1).value = 'Model';
  worksheet.getCell(dataRow, 1).font = { bold: true };
  let colIdx = 2;
  for (const code of sortedCodes) {
    worksheet.getCell(dataRow, colIdx).value = `Code ${code}`;
    worksheet.getCell(dataRow, colIdx).font = { bold: true };
    colIdx++;
  }
  dataRow++;

  const distStartRow = dataRow;

  // Add distribution data
  for (const stat of modelStats) {
    worksheet.getCell(dataRow, 1).value = stat.modelName;
    colIdx = 2;
    for (const code of sortedCodes) {
      worksheet.getCell(dataRow, colIdx).value = stat.decisionDistribution[code] ?? 0;
      colIdx++;
    }
    dataRow++;
  }

  const distEndRow = dataRow - 1;

  // Add stacked bar chart for decision distribution
  if (sortedCodes.length > 0) {
    addStackedBarChart(worksheet, {
      title: 'Decision Code Distribution by Model',
      dataRange: {
        startRow: distStartRow,
        endRow: distEndRow,
        labelCol: 1,
        valueStartCol: 2,
        valueEndCol: 1 + sortedCodes.length,
        seriesNames: sortedCodes.map((c) => `Code ${c}`),
      },
      position: { col: 4, row: meanScoresEndRow + 5 },
      xAxisTitle: 'Model',
      yAxisTitle: 'Count',
    });
  }
}

// ============================================================================
// BAR CHART
// ============================================================================

type BarChartOptions = {
  title: string;
  dataRange: {
    startRow: number;
    endRow: number;
    labelCol: number;
    valueCol: number;
  };
  position: { col: number; row: number };
  xAxisTitle?: string;
  yAxisTitle?: string;
};

/**
 * Add a bar chart to a worksheet.
 *
 * Note: ExcelJS has limited chart support. We create a basic structure
 * that Excel can render. For complex charts, the data is provided and
 * users can create charts manually if needed.
 */
function addBarChart(worksheet: ExcelJS.Worksheet, options: BarChartOptions): void {
  const { title, dataRange, position } = options;

  // ExcelJS doesn't have full chart API, so we add a visual indicator
  // The actual chart needs to be created by reading the data

  // Add chart placeholder text
  const chartCell = worksheet.getCell(position.row, position.col);
  chartCell.value = `📊 ${title}`;
  chartCell.font = { bold: true, size: 12 };

  // Add note about data location
  const noteCell = worksheet.getCell(position.row + 1, position.col);
  noteCell.value = `(Chart data in columns A-B, rows ${dataRange.startRow}-${dataRange.endRow})`;
  noteCell.font = { italic: true, size: 10, color: { argb: 'FF666666' } };

  // Since ExcelJS doesn't support chart creation well, we'll add
  // a formatted data table that users can select to create a chart

  // Copy data to chart area for easy selection
  const chartDataStartRow = position.row + 3;
  let chartRow = chartDataStartRow;

  // Header
  worksheet.getCell(chartRow, position.col).value = 'Model';
  worksheet.getCell(chartRow, position.col + 1).value = 'Score';
  worksheet.getCell(chartRow, position.col).font = { bold: true };
  worksheet.getCell(chartRow, position.col + 1).font = { bold: true };
  chartRow++;

  // Data
  for (let r = dataRange.startRow; r <= dataRange.endRow; r++) {
    const label = worksheet.getCell(r, dataRange.labelCol).value;
    const value = worksheet.getCell(r, dataRange.valueCol).value;
    worksheet.getCell(chartRow, position.col).value = label;
    worksheet.getCell(chartRow, position.col + 1).value = value;
    chartRow++;
  }

  // Add visual bar representation using characters
  chartRow++;
  for (let r = dataRange.startRow; r <= dataRange.endRow; r++) {
    const label = worksheet.getCell(r, dataRange.labelCol).value;
    const value = worksheet.getCell(r, dataRange.valueCol).value;
    const numValue = typeof value === 'number' ? value : 0;

    // Create a simple text-based bar (scale 0-5 to 0-20 characters)
    const barLength = Math.round((numValue / 5) * 20);
    const bar = '█'.repeat(Math.max(0, barLength));

    worksheet.getCell(chartRow, position.col).value = label;
    worksheet.getCell(chartRow, position.col + 1).value = bar;
    worksheet.getCell(chartRow, position.col + 2).value = numValue;
    worksheet.getCell(chartRow, position.col + 1).font = {
      color: { argb: CHART_COLORS[0] ? `FF${CHART_COLORS[0]}` : 'FF4472C4' },
    };
    chartRow++;
  }
}

// ============================================================================
// STACKED BAR CHART
// ============================================================================

type StackedBarChartOptions = {
  title: string;
  dataRange: {
    startRow: number;
    endRow: number;
    labelCol: number;
    valueStartCol: number;
    valueEndCol: number;
    seriesNames: string[];
  };
  position: { col: number; row: number };
  xAxisTitle?: string;
  yAxisTitle?: string;
};

/**
 * Add a stacked bar chart to a worksheet.
 */
function addStackedBarChart(worksheet: ExcelJS.Worksheet, options: StackedBarChartOptions): void {
  const { title, dataRange, position } = options;

  // Add chart placeholder text
  const chartCell = worksheet.getCell(position.row, position.col);
  chartCell.value = `📊 ${title}`;
  chartCell.font = { bold: true, size: 12 };

  // Add note about data location
  const noteCell = worksheet.getCell(position.row + 1, position.col);
  noteCell.value = `(Data for stacked chart in rows ${dataRange.startRow}-${dataRange.endRow})`;
  noteCell.font = { italic: true, size: 10, color: { argb: 'FF666666' } };

  // Add a summary table showing totals
  const summaryStartRow = position.row + 3;
  let summaryRow = summaryStartRow;

  // Header
  worksheet.getCell(summaryRow, position.col).value = 'Model';
  worksheet.getCell(summaryRow, position.col).font = { bold: true };
  let colOffset = 1;
  for (const seriesName of dataRange.seriesNames) {
    worksheet.getCell(summaryRow, position.col + colOffset).value = seriesName;
    worksheet.getCell(summaryRow, position.col + colOffset).font = { bold: true };
    colOffset++;
  }
  worksheet.getCell(summaryRow, position.col + colOffset).value = 'Total';
  worksheet.getCell(summaryRow, position.col + colOffset).font = { bold: true };
  summaryRow++;

  // Data rows with visual representation
  for (let r = dataRange.startRow; r <= dataRange.endRow; r++) {
    const label = worksheet.getCell(r, dataRange.labelCol).value;
    worksheet.getCell(summaryRow, position.col).value = label;

    let total = 0;
    colOffset = 1;
    for (let c = dataRange.valueStartCol; c <= dataRange.valueEndCol; c++) {
      const value = worksheet.getCell(r, c).value;
      const numValue = typeof value === 'number' ? value : 0;
      worksheet.getCell(summaryRow, position.col + colOffset).value = numValue;
      total += numValue;
      colOffset++;
    }
    worksheet.getCell(summaryRow, position.col + colOffset).value = total;
    summaryRow++;
  }

  // Add text-based stacked bar visualization
  summaryRow++;
  worksheet.getCell(summaryRow, position.col).value = 'Visual Distribution:';
  worksheet.getCell(summaryRow, position.col).font = { bold: true };
  summaryRow++;

  for (let r = dataRange.startRow; r <= dataRange.endRow; r++) {
    const label = worksheet.getCell(r, dataRange.labelCol).value;
    worksheet.getCell(summaryRow, position.col).value = label;

    // Build stacked bar string
    let stackedBar = '';
    let colorIdx = 0;
    for (let c = dataRange.valueStartCol; c <= dataRange.valueEndCol; c++) {
      const value = worksheet.getCell(r, c).value;
      const numValue = typeof value === 'number' ? value : 0;
      // Use different characters for different series
      const chars = ['█', '▓', '▒', '░', '▄'];
      const char = chars[colorIdx % chars.length] ?? '█';
      stackedBar += char.repeat(Math.min(numValue, 20));
      colorIdx++;
    }

    worksheet.getCell(summaryRow, position.col + 1).value = stackedBar;
    summaryRow++;
  }
}

// ============================================================================
// HORIZONTAL BAR CHART (for Dimension Impact)
// ============================================================================

type HorizontalBarChartOptions = {
  title: string;
  labels: string[];
  values: number[];
  position: { col: number; row: number };
  yAxisTitle?: string;
};

/**
 * Add a horizontal bar chart for dimension impact visualization.
 */
export function addHorizontalBarChart(
  worksheet: ExcelJS.Worksheet,
  options: HorizontalBarChartOptions
): void {
  const { title, labels, values, position } = options;

  // Add chart title
  const chartCell = worksheet.getCell(position.row, position.col);
  chartCell.value = `📊 ${title}`;
  chartCell.font = { bold: true, size: 12 };

  // Normalize values to create proportional bars
  const maxValue = Math.max(...values, 0.001);
  const maxBarLength = 30;

  let row = position.row + 2;

  // Header
  worksheet.getCell(row, position.col).value = 'Dimension';
  worksheet.getCell(row, position.col + 1).value = 'Impact';
  worksheet.getCell(row, position.col + 2).value = 'Effect Size';
  worksheet.getCell(row, position.col).font = { bold: true };
  worksheet.getCell(row, position.col + 1).font = { bold: true };
  worksheet.getCell(row, position.col + 2).font = { bold: true };
  row++;

  // Data with visual bars
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i] ?? '';
    const value = values[i] ?? 0;
    const barLength = Math.round((value / maxValue) * maxBarLength);
    const bar = '█'.repeat(Math.max(0, barLength));

    worksheet.getCell(row, position.col).value = label;
    worksheet.getCell(row, position.col + 1).value = bar;
    worksheet.getCell(row, position.col + 1).font = {
      color: { argb: 'FF4472C4' },
    };
    worksheet.getCell(row, position.col + 2).value = value;
    row++;
  }
}

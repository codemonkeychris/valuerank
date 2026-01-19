/**
 * XLSX Charts Module
 *
 * Functions for creating native Excel charts using xlsx-chart library.
 * Charts are created in a separate workbook and merged at the ZIP level.
 */

// @ts-expect-error xlsx-chart has no TypeScript types
import XLSXChartDefault from 'xlsx-chart';
import AdmZip from 'adm-zip';
import type ExcelJS from 'exceljs';

import { addWorksheet } from './workbook.js';
import type { ModelStatistics, XLSXChartInstance, XLSXChartOptions } from './types.js';

// Cast the imported class constructor to our typed interface
const XLSXChart = XLSXChartDefault as unknown as new () => XLSXChartInstance;

// ============================================================================
// NATIVE CHART GENERATION
// ============================================================================

/**
 * Generate a native Excel bar chart as a buffer.
 *
 * @param title - Chart title
 * @param data - Model statistics for the chart
 * @returns Promise resolving to chart workbook buffer
 */
async function generateNativeBarChart(
  _title: string,
  models: string[],
  decisionCodes: string[],
  distributionData: Record<string, Record<string, number>>
): Promise<Buffer> {
  const xlsxChart = new XLSXChart();

  // Build the data structure for xlsx-chart
  // titles = series names (models)
  // fields = categories (decision codes)
  // data = { model: { code: count } }
  const opts: XLSXChartOptions = {
    chart: 'bar',
    titles: models,
    fields: decisionCodes,
    data: distributionData,
  };

  return new Promise((resolve, reject) => {
    xlsxChart.generate(opts, (err: Error | null, data: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// ============================================================================
// CHART DATA PREPARATION
// ============================================================================

/**
 * Prepare chart data from model statistics.
 */
function prepareChartData(modelStats: ModelStatistics[]): {
  models: string[];
  decisionCodes: string[];
  distributionData: Record<string, Record<string, number>>;
} {
  // Collect all unique decision codes
  const allCodes = new Set<string>();
  for (const stat of modelStats) {
    for (const code of Object.keys(stat.decisionDistribution)) {
      // Only include numeric decision codes (1-5 scale)
      if (/^\d+$/.test(code)) {
        allCodes.add(code);
      }
    }
  }
  const decisionCodes = Array.from(allCodes).sort();

  // Build distribution data in xlsx-chart format
  const models = modelStats.map((s) => s.modelName);
  const distributionData: Record<string, Record<string, number>> = {};

  for (const stat of modelStats) {
    const modelData: Record<string, number> = {};
    for (const code of decisionCodes) {
      modelData[code] = stat.decisionDistribution[code] ?? 0;
    }
    distributionData[stat.modelName] = modelData;
  }

  return { models, decisionCodes, distributionData };
}

// ============================================================================
// ZIP MERGE UTILITY
// ============================================================================

/**
 * Merge chart from xlsx-chart workbook into ExcelJS workbook buffer.
 *
 * This extracts the chart XML parts from the chart workbook and
 * injects them into the main workbook at the ZIP level.
 */
export function mergeChartIntoWorkbook(
  mainWorkbookBuffer: Buffer,
  chartWorkbookBuffer: Buffer,
  _chartSheetName: string
): Buffer {
  const mainZip = new AdmZip(mainWorkbookBuffer);
  const chartZip = new AdmZip(chartWorkbookBuffer);

  // Get chart-related files from the chart workbook
  const chartEntries = chartZip.getEntries();

  // Find chart, drawing, and relationship files
  for (const entry of chartEntries) {
    const name = entry.entryName;

    // Copy chart files
    if (name.startsWith('xl/charts/')) {
      const content = entry.getData();
      mainZip.addFile(name, content);
    }

    // Copy drawing files
    if (name.startsWith('xl/drawings/')) {
      const content = entry.getData();
      mainZip.addFile(name, content);
    }

    // Copy chart relationships
    if (name.startsWith('xl/charts/_rels/')) {
      const content = entry.getData();
      mainZip.addFile(name, content);
    }

    // Copy drawing relationships
    if (name.startsWith('xl/drawings/_rels/')) {
      const content = entry.getData();
      mainZip.addFile(name, content);
    }
  }

  // Update Content_Types.xml to include chart content types
  const contentTypesEntry = mainZip.getEntry('[Content_Types].xml');
  if (contentTypesEntry) {
    let contentTypes = contentTypesEntry.getData().toString('utf8');

    // Add chart content type if not present
    if (!contentTypes.includes('application/vnd.openxmlformats-officedocument.drawingml.chart+xml')) {
      contentTypes = contentTypes.replace(
        '</Types>',
        '  <Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>\n' +
          '  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>\n' +
          '</Types>'
      );
      mainZip.updateFile('[Content_Types].xml', Buffer.from(contentTypes, 'utf8'));
    }
  }

  // Find the Charts worksheet and add drawing reference
  const entries = mainZip.getEntries();
  let chartSheetIndex = -1;

  for (const entry of entries) {
    if (entry.entryName.startsWith('xl/worksheets/sheet') && entry.entryName.endsWith('.xml')) {
      const sheetContent = entry.getData().toString('utf8');
      if (sheetContent.includes(`<sheetData`) || entry.entryName.includes('sheet')) {
        // Try to find the Charts worksheet by checking the workbook.xml
        const match = entry.entryName.match(/sheet(\d+)\.xml/);
        if (match && match[1]) {
          const idx = parseInt(match[1], 10);
          if (idx > chartSheetIndex) {
            chartSheetIndex = idx;
          }
        }
      }
    }
  }

  // Add drawing reference to the last worksheet (Charts)
  if (chartSheetIndex > 0) {
    const sheetPath = `xl/worksheets/sheet${chartSheetIndex}.xml`;
    const sheetEntry = mainZip.getEntry(sheetPath);

    if (sheetEntry) {
      let sheetXml = sheetEntry.getData().toString('utf8');

      // Add drawing reference if not present
      if (!sheetXml.includes('<drawing')) {
        sheetXml = sheetXml.replace(
          '</worksheet>',
          '  <drawing r:id="rId1"/>\n</worksheet>'
        );

        // Ensure namespace is present
        if (!sheetXml.includes('xmlns:r=')) {
          sheetXml = sheetXml.replace(
            '<worksheet',
            '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
          );
        }

        mainZip.updateFile(sheetPath, Buffer.from(sheetXml, 'utf8'));
      }

      // Create relationship file for the worksheet
      const relsPath = `xl/worksheets/_rels/sheet${chartSheetIndex}.xml.rels`;
      const relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
      mainZip.addFile(relsPath, Buffer.from(relsContent, 'utf8'));
    }
  }

  return mainZip.toBuffer();
}

// ============================================================================
// CHARTS WORKSHEET BUILDER
// ============================================================================

/**
 * Build the Charts worksheet with data and native charts.
 *
 * Creates a data table that will be used as the source for the native chart.
 * The native chart is added in a post-processing step via mergeChartIntoWorkbook.
 *
 * @returns Chart buffer to be merged, or null if no chart created
 */
export async function buildChartsSheet(
  workbook: ExcelJS.Workbook,
  modelStats: ModelStatistics[]
): Promise<Buffer | null> {
  if (modelStats.length === 0) {
    return null;
  }

  // Prepare chart data
  const { models, decisionCodes, distributionData } = prepareChartData(modelStats);

  if (decisionCodes.length === 0) {
    // No numeric decision codes, can't create distribution chart
    return null;
  }

  // Create charts worksheet with data source
  const worksheet = addWorksheet(workbook, {
    name: 'Charts',
    type: 'charts',
  });

  // Add title
  worksheet.getCell('A1').value = 'Decision Distribution by Model';
  worksheet.getCell('A1').font = { bold: true, size: 14 };

  // Add note about native chart
  worksheet.getCell('A2').value = 'Chart is displayed below the data table.';
  worksheet.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF666666' } };

  // Build data table for the chart (starting at row 4)
  let row = 4;

  // Header row: blank | Code1 | Code2 | ...
  worksheet.getCell(row, 1).value = 'Model';
  worksheet.getCell(row, 1).font = { bold: true };
  let col = 2;
  for (const code of decisionCodes) {
    worksheet.getCell(row, col).value = `Score ${code}`;
    worksheet.getCell(row, col).font = { bold: true };
    col++;
  }
  row++;

  // Data rows: Model | Count1 | Count2 | ...
  for (const stat of modelStats) {
    worksheet.getCell(row, 1).value = stat.modelName;
    col = 2;
    for (const code of decisionCodes) {
      worksheet.getCell(row, col).value = stat.decisionDistribution[code] ?? 0;
      col++;
    }
    row++;
  }

  // Set column widths
  worksheet.getColumn(1).width = 25;
  for (let c = 2; c <= decisionCodes.length + 1; c++) {
    worksheet.getColumn(c).width = 12;
  }

  // Generate native bar chart
  try {
    const chartBuffer = await generateNativeBarChart(
      'Decision Distribution by Model',
      models,
      decisionCodes.map((c) => `Score ${c}`),
      Object.fromEntries(
        Object.entries(distributionData).map(([model, data]) => [
          model,
          Object.fromEntries(
            Object.entries(data).map(([code, count]) => [`Score ${code}`, count])
          ),
        ])
      )
    );

    return chartBuffer;
  } catch {
    // If chart generation fails, return null (chart won't be included)
    return null;
  }
}

// ============================================================================
// SIMPLE CHARTS WORKSHEET (FALLBACK)
// ============================================================================

/**
 * Build a simple charts worksheet without native charts (fallback).
 * Used when chart generation fails or for testing.
 */
export function buildSimpleChartsSheet(
  workbook: ExcelJS.Workbook,
  modelStats: ModelStatistics[]
): void {
  const worksheet = addWorksheet(workbook, {
    name: 'Charts',
    type: 'charts',
  });

  // Add title
  worksheet.getCell('A1').value = 'Decision Distribution by Model';
  worksheet.getCell('A1').font = { bold: true, size: 14 };

  if (modelStats.length === 0) {
    worksheet.getCell('A3').value = 'No model data available for chart.';
    return;
  }

  // Prepare data
  const { models, decisionCodes, distributionData } = prepareChartData(modelStats);

  if (decisionCodes.length === 0) {
    worksheet.getCell('A3').value = 'No numeric decision codes found for chart.';
    return;
  }

  // Build data table
  let row = 3;

  // Header row
  worksheet.getCell(row, 1).value = 'Model';
  worksheet.getCell(row, 1).font = { bold: true };
  let col = 2;
  for (const code of decisionCodes) {
    worksheet.getCell(row, col).value = `Score ${code}`;
    worksheet.getCell(row, col).font = { bold: true };
    col++;
  }
  worksheet.getCell(row, col).value = 'Total';
  worksheet.getCell(row, col).font = { bold: true };
  row++;

  // Data rows
  for (const model of models) {
    worksheet.getCell(row, 1).value = model;
    col = 2;
    let total = 0;
    for (const code of decisionCodes) {
      const count = distributionData[model]?.[code] ?? 0;
      worksheet.getCell(row, col).value = count;
      total += count;
      col++;
    }
    worksheet.getCell(row, col).value = total;
    row++;
  }

  // Set column widths
  worksheet.getColumn(1).width = 25;
  for (let c = 2; c <= decisionCodes.length + 2; c++) {
    worksheet.getColumn(c).width = 12;
  }

  // Add note about creating a chart
  row += 2;
  worksheet.getCell(row, 1).value = '📊 To create a chart:';
  worksheet.getCell(row, 1).font = { bold: true };
  row++;
  worksheet.getCell(row, 1).value = '1. Select the data table above (including headers)';
  row++;
  worksheet.getCell(row, 1).value = '2. Go to Insert > Charts > Bar Chart';
  row++;
  worksheet.getCell(row, 1).value = '3. Choose "Clustered Bar" for best visualization';
}

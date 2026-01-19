/**
 * XLSX Worksheet Builders
 *
 * Functions for building specific worksheets in the Excel export.
 * Each function creates a complete worksheet with data and formatting.
 */

import type ExcelJS from 'exceljs';

import { addWorksheet, createColumnConfig } from './workbook.js';
import {
  applyTableStyle,
  autoSizeColumns,
  applyWrapText,
  applyNumberFormat,
  applyColorScale,
  NUMBER_FORMATS,
} from './formatting.js';
import type {
  TranscriptWithScenario,
  ModelStatistics,
  ModelAgreementData,
  ContestedScenario,
  DimensionImpact,
  ScenarioContent,
  TranscriptContent,
} from './types.js';

// Re-import constants since TypeScript can't import them from type-only exports
const CELL_MAX_CHARS = 32767;
const TRUNCATE_MSG = '\n\n[TRUNCATED - Response exceeded 32,767 character limit]';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract short model name from model ID.
 * E.g., "anthropic:claude-3-5-haiku-20241022" -> "claude-3-5-haiku"
 */
function getModelName(modelId: string): string {
  const withoutProvider = modelId.includes(':') ? modelId.split(':')[1] ?? modelId : modelId;
  return withoutProvider.replace(/-\d{8}$/, '');
}

/**
 * Extract the target response from transcript content.
 * Combines all target responses from all turns.
 */
function getTargetResponse(transcript: TranscriptWithScenario): string {
  const content = transcript.content as TranscriptContent | null;
  if (!content?.turns || !Array.isArray(content.turns)) {
    return '';
  }

  const responses = content.turns
    .map((turn) => turn.targetResponse ?? '')
    .filter((r) => r.length > 0);

  return responses.join('\n\n---\n\n');
}

/**
 * Extract dimension scores from scenario content.
 */
function getScenarioDimensions(transcript: TranscriptWithScenario): Record<string, number> {
  const content = transcript.scenario?.content as ScenarioContent | null;
  if (content?.dimensions && typeof content.dimensions === 'object') {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(content.dimensions)) {
      if (typeof value === 'number') {
        result[key] = value;
      }
    }
    return result;
  }
  return {};
}

/**
 * Truncate a string to Excel's cell character limit.
 */
function truncateForExcel(text: string): string {
  if (text.length <= CELL_MAX_CHARS) {
    return text;
  }
  const truncateAt = CELL_MAX_CHARS - TRUNCATE_MSG.length;
  return text.substring(0, truncateAt) + TRUNCATE_MSG;
}

/**
 * Collect all unique dimension names from transcripts.
 */
function collectDimensionNames(transcripts: TranscriptWithScenario[]): string[] {
  const names = new Set<string>();
  for (const transcript of transcripts) {
    const dims = getScenarioDimensions(transcript);
    for (const key of Object.keys(dims)) {
      names.add(key);
    }
  }
  return Array.from(names).sort();
}

/**
 * Parse decision code as a numeric score.
 * Returns null if not parseable.
 */
function parseDecisionScore(code: string | null): number | null {
  if (code === null || code === undefined || code === '') return null;
  const num = parseInt(code, 10);
  return isNaN(num) ? null : num;
}

/**
 * Calculate standard deviation.
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ============================================================================
// RAW DATA WORKSHEET
// ============================================================================

/**
 * Build the Raw Data worksheet with all transcript records.
 *
 * Columns: Model Name, Sample Index, [Dimension columns], Decision Code,
 *          Decision Text, Transcript ID, Full Response
 */
export function buildRawDataSheet(
  workbook: ExcelJS.Workbook,
  transcripts: TranscriptWithScenario[]
): void {
  // Collect dimension names for dynamic columns
  const dimensionNames = collectDimensionNames(transcripts);

  // Build column configuration
  const columns = createColumnConfig([
    { header: 'AI Model Name', key: 'modelName', width: 20 },
    { header: 'Sample Index', key: 'sampleIndex', width: 12 },
    ...dimensionNames.map((name) => ({ header: name, key: `dim_${name}`, width: 12 })),
    { header: 'Decision Code', key: 'decisionCode', width: 14 },
    { header: 'Decision Text', key: 'decisionText', width: 40 },
    { header: 'Transcript ID', key: 'transcriptId', width: 14 },
    { header: 'Full Response', key: 'fullResponse', width: 60 },
  ]);

  // Create worksheet
  const worksheet = addWorksheet(workbook, {
    name: 'Raw Data',
    type: 'raw_data',
    columns,
  });

  // Add data rows
  for (const transcript of transcripts) {
    const dimensions = getScenarioDimensions(transcript);
    const response = getTargetResponse(transcript);

    const rowData: Record<string, unknown> = {
      modelName: getModelName(transcript.modelId),
      sampleIndex: transcript.sampleIndex,
      decisionCode: transcript.decisionCode ?? '',
      decisionText: transcript.decisionText ?? '',
      transcriptId: transcript.id,
      fullResponse: truncateForExcel(response),
    };

    // Add dimension values
    for (const dimName of dimensionNames) {
      rowData[`dim_${dimName}`] = dimensions[dimName] ?? '';
    }

    worksheet.addRow(rowData);
  }

  // Apply formatting
  const rowCount = transcripts.length + 1; // +1 for header
  const colCount = columns.length;

  applyTableStyle(worksheet, 1, rowCount, 1, colCount);
  autoSizeColumns(worksheet);

  // Apply wrap text to response column
  const responseColIndex = columns.findIndex((c) => c.key === 'fullResponse') + 1;
  if (responseColIndex > 0) {
    applyWrapText(worksheet, responseColIndex);
  }
}

// ============================================================================
// MODEL SUMMARY WORKSHEET
// ============================================================================

/**
 * Build the Model Summary worksheet with per-model statistics.
 *
 * Returns the computed model statistics for use in charts.
 */
export function buildModelSummarySheet(
  workbook: ExcelJS.Workbook,
  transcripts: TranscriptWithScenario[]
): ModelStatistics[] {
  // Group transcripts by model
  const modelGroups = new Map<string, TranscriptWithScenario[]>();
  for (const transcript of transcripts) {
    const modelName = getModelName(transcript.modelId);
    const group = modelGroups.get(modelName) ?? [];
    group.push(transcript);
    modelGroups.set(modelName, group);
  }

  // Calculate statistics for each model
  const stats: ModelStatistics[] = [];

  for (const [modelName, modelTranscripts] of modelGroups) {
    // Parse decision codes as scores
    const scores = modelTranscripts
      .map((t) => parseDecisionScore(t.decisionCode))
      .filter((s): s is number => s !== null);

    // Calculate decision distribution
    const distribution: Record<string, number> = {};
    for (const t of modelTranscripts) {
      const code = t.decisionCode ?? 'unknown';
      distribution[code] = (distribution[code] ?? 0) + 1;
    }

    // Calculate mean and std dev
    const meanScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const stdDev = calculateStdDev(scores);

    stats.push({
      modelName,
      sampleCount: modelTranscripts.length,
      meanScore,
      stdDev,
      decisionDistribution: distribution,
    });
  }

  // Sort by model name
  stats.sort((a, b) => a.modelName.localeCompare(b.modelName));

  // Create worksheet
  const columns = createColumnConfig([
    { header: 'Model Name', key: 'modelName', width: 25 },
    { header: 'Sample Count', key: 'sampleCount', width: 14 },
    { header: 'Mean Score', key: 'meanScore', width: 12 },
    { header: 'Std Deviation', key: 'stdDev', width: 14 },
  ]);

  const worksheet = addWorksheet(workbook, {
    name: 'Model Summary',
    type: 'model_summary',
    columns,
  });

  // Add data rows
  for (const stat of stats) {
    worksheet.addRow({
      modelName: stat.modelName,
      sampleCount: stat.sampleCount,
      meanScore: stat.meanScore,
      stdDev: stat.stdDev,
    });
  }

  // Apply formatting
  const rowCount = stats.length + 1;
  applyTableStyle(worksheet, 1, rowCount, 1, columns.length);
  autoSizeColumns(worksheet);

  // Apply number formats
  applyNumberFormat(worksheet, 3, NUMBER_FORMATS.decimal2); // Mean Score
  applyNumberFormat(worksheet, 4, NUMBER_FORMATS.decimal3); // Std Deviation

  return stats;
}

// ============================================================================
// MODEL AGREEMENT WORKSHEET
// ============================================================================

/**
 * Build the Model Agreement worksheet with correlation matrix.
 */
export function buildModelAgreementSheet(
  workbook: ExcelJS.Workbook,
  data: ModelAgreementData
): void {
  // Create worksheet
  const worksheet = addWorksheet(workbook, {
    name: 'Model Agreement',
    type: 'model_agreement',
  });

  // Add header row with model names
  const headerRow = ['Model', ...data.models];
  worksheet.addRow(headerRow);

  // Add data rows (correlation matrix)
  for (let i = 0; i < data.models.length; i++) {
    const rowData = [data.models[i], ...(data.correlationMatrix[i] ?? [])];
    worksheet.addRow(rowData);
  }

  // Set column widths
  worksheet.getColumn(1).width = 25; // Model name column
  for (let i = 2; i <= data.models.length + 1; i++) {
    worksheet.getColumn(i).width = 15;
  }

  // Apply formatting
  const rowCount = data.models.length + 1;
  const colCount = data.models.length + 1;

  applyTableStyle(worksheet, 1, rowCount, 1, colCount);

  // Apply color scale to correlation values (not the model name column)
  if (data.models.length > 1) {
    applyColorScale(worksheet, 2, rowCount, 2, colCount);
  }

  // Apply number format to correlation cells
  for (let col = 2; col <= colCount; col++) {
    applyNumberFormat(worksheet, col, NUMBER_FORMATS.decimal3);
  }
}

// ============================================================================
// CONTESTED SCENARIOS WORKSHEET
// ============================================================================

/**
 * Build the Contested Scenarios worksheet with high-variance scenarios.
 */
export function buildContestedScenariosSheet(
  workbook: ExcelJS.Workbook,
  scenarios: ContestedScenario[]
): void {
  // Create worksheet
  const columns = createColumnConfig([
    { header: 'Scenario ID', key: 'scenarioId', width: 14 },
    { header: 'Scenario Name', key: 'scenarioName', width: 30 },
    { header: 'Variance', key: 'variance', width: 12 },
  ]);

  const worksheet = addWorksheet(workbook, {
    name: 'Contested Scenarios',
    type: 'contested_scenarios',
    columns,
  });

  // Sort by variance (highest first) and take top 10
  const topScenarios = [...scenarios].sort((a, b) => b.variance - a.variance).slice(0, 10);

  // Add data rows
  for (const scenario of topScenarios) {
    worksheet.addRow({
      scenarioId: scenario.scenarioId,
      scenarioName: scenario.scenarioName,
      variance: scenario.variance,
    });
  }

  // Apply formatting
  const rowCount = topScenarios.length + 1;
  applyTableStyle(worksheet, 1, rowCount, 1, columns.length);
  autoSizeColumns(worksheet);

  // Apply number format to variance column
  applyNumberFormat(worksheet, 3, NUMBER_FORMATS.decimal3);
}

// ============================================================================
// DIMENSION IMPACT WORKSHEET
// ============================================================================

/**
 * Build the Dimension Impact worksheet with ranked dimensions.
 */
export function buildDimensionImpactSheet(
  workbook: ExcelJS.Workbook,
  dimensions: DimensionImpact[]
): void {
  // Create worksheet
  const columns = createColumnConfig([
    { header: 'Dimension', key: 'dimensionName', width: 25 },
    { header: 'Effect Size', key: 'effectSize', width: 14 },
    { header: 'p-Value', key: 'pValue', width: 12 },
  ]);

  const worksheet = addWorksheet(workbook, {
    name: 'Dimension Impact',
    type: 'dimension_impact',
    columns,
  });

  // Sort by effect size (highest first)
  const sortedDimensions = [...dimensions].sort((a, b) => b.effectSize - a.effectSize);

  // Add data rows
  for (const dim of sortedDimensions) {
    worksheet.addRow({
      dimensionName: dim.dimensionName,
      effectSize: dim.effectSize,
      pValue: dim.pValue,
    });
  }

  // Apply formatting
  const rowCount = sortedDimensions.length + 1;
  applyTableStyle(worksheet, 1, rowCount, 1, columns.length);
  autoSizeColumns(worksheet);

  // Apply number formats
  applyNumberFormat(worksheet, 2, NUMBER_FORMATS.decimal3); // Effect Size
  applyNumberFormat(worksheet, 3, NUMBER_FORMATS.scientific); // p-Value
}

// ============================================================================
// METHODS WORKSHEET
// ============================================================================

/**
 * Build the Methods worksheet with documentation and warnings.
 */
export function buildMethodsSheet(workbook: ExcelJS.Workbook, warnings: string[]): void {
  // Create worksheet
  const worksheet = addWorksheet(workbook, {
    name: 'Methods',
    type: 'methods',
  });

  // Set up columns
  worksheet.getColumn(1).width = 100;

  let row = 1;

  // Title
  const titleCell = worksheet.getCell(row, 1);
  titleCell.value = 'ValueRank Export - Methodology Documentation';
  titleCell.font = { bold: true, size: 14 };
  row += 2;

  // Statistics explanation
  const sections = [
    {
      title: 'Mean Score Calculation',
      content:
        'The mean score is calculated as the arithmetic average of all numeric decision codes for each model. ' +
        'Decision codes are typically on a 1-5 scale where 1 indicates one value priority and 5 indicates the opposite.',
    },
    {
      title: 'Standard Deviation',
      content:
        'Standard deviation measures the spread of decision codes around the mean. ' +
        'Higher values indicate more variable responses. Calculated using the sample standard deviation formula (n-1 denominator).',
    },
    {
      title: 'Model Correlation',
      content:
        "Pearson correlation coefficients measure how similarly two models respond across scenarios. " +
        'Values near 1.0 indicate models tend to make similar decisions, while values near 0 indicate independent patterns.',
    },
    {
      title: 'Contested Scenarios',
      content:
        'Scenarios are ranked by variance across models. High variance indicates scenarios where models disagreed most strongly. ' +
        'The top 10 most contested scenarios are shown.',
    },
    {
      title: 'Dimension Impact',
      content:
        'Dimension impact is measured using the Kruskal-Wallis H test, a non-parametric test for differences between groups. ' +
        'Effect size indicates how much each dimension influences model decisions. Lower p-values indicate statistically significant effects.',
    },
  ];

  for (const section of sections) {
    const sectionTitleCell = worksheet.getCell(row, 1);
    sectionTitleCell.value = section.title;
    sectionTitleCell.font = { bold: true, size: 12 };
    row++;

    const contentCell = worksheet.getCell(row, 1);
    contentCell.value = section.content;
    contentCell.alignment = { wrapText: true };
    row += 2;
  }

  // Warnings section
  if (warnings.length > 0) {
    row++;
    const warningsTitleCell = worksheet.getCell(row, 1);
    warningsTitleCell.value = 'Data Quality Warnings';
    warningsTitleCell.font = { bold: true, size: 12, color: { argb: 'FFFF0000' } };
    row++;

    for (const warning of warnings) {
      const warningCell = worksheet.getCell(row, 1);
      warningCell.value = `⚠ ${warning}`;
      warningCell.alignment = { wrapText: true };
      row++;
    }
  }

  // Footer
  row += 2;
  const footerCell = worksheet.getCell(row, 1);
  footerCell.value = `Generated by ValueRank on ${new Date().toISOString()}`;
  footerCell.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
}

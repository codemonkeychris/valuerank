/**
 * XLSX Export Service
 *
 * Main entry point for Excel export functionality.
 * Generates multi-worksheet workbooks with charts for run analysis.
 */

import { createLogger } from '@valuerank/shared';

import { createWorkbook, workbookToBuffer, generateXlsxFilename, XLSX_MIME_TYPE } from './workbook.js';

import type { XlsxExportOptions, XlsxExportResult, RunExportData } from './types.js';

const log = createLogger('export:xlsx');

// ============================================================================
// PUBLIC API
// ============================================================================

// Re-export types
export * from './types.js';

// Re-export workbook utilities
export { createWorkbook, generateXlsxFilename, XLSX_MIME_TYPE } from './workbook.js';

// Re-export formatting utilities
export {
  applyHeaderStyle,
  applyTableStyle,
  applyAutoFilter,
  autoSizeColumns,
  applyColorScale,
  applyDataBars,
  COLORS,
  CHART_COLORS,
} from './formatting.js';

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate an Excel export for a run.
 *
 * Creates a multi-worksheet workbook containing:
 * - Raw Data: All transcripts with model responses
 * - Model Summary: Per-model statistics
 * - Charts: Visual comparison of models
 * - Model Agreement: Correlation matrix (if 2+ models)
 * - Contested Scenarios: High-variance scenarios (if analysis available)
 * - Dimension Impact: Ranked dimension effects (if analysis available)
 * - Methods: Documentation and warnings
 *
 * @param data - Complete run data for export
 * @param options - Export configuration options
 * @returns Export result with buffer and metadata
 */
export async function generateExcelExport(
  data: RunExportData,
  options: XlsxExportOptions
): Promise<XlsxExportResult> {
  const { runId, includeAnalysis = true, includeMethods = true, includeCharts = true } = options;

  log.info(
    {
      runId,
      transcriptCount: data.transcripts.length,
      includeAnalysis,
      includeMethods,
      includeCharts,
    },
    'Starting Excel export'
  );

  const startTime = Date.now();

  // Create workbook
  const workbook = createWorkbook(runId);

  // Import worksheet builders dynamically to keep this file small
  const { buildRawDataSheet, buildModelSummarySheet, buildMethodsSheet } = await import(
    './worksheets.js'
  );
  const { buildChartsSheet } = await import('./charts.js');

  // Build Raw Data worksheet (always included)
  log.debug({ runId }, 'Building Raw Data worksheet');
  buildRawDataSheet(workbook, data.transcripts);

  // Build Model Summary worksheet (always included)
  log.debug({ runId }, 'Building Model Summary worksheet');
  const modelStats = buildModelSummarySheet(workbook, data.transcripts);

  // Build Charts worksheet (if enabled and we have data)
  if (includeCharts && modelStats.length > 0) {
    log.debug({ runId, modelCount: modelStats.length }, 'Building Charts worksheet');
    buildChartsSheet(workbook, modelStats);
  }

  // Build analysis worksheets (if enabled and data available)
  if (includeAnalysis && data.analysisResult) {
    const {
      buildModelAgreementSheet,
      buildContestedScenariosSheet,
      buildDimensionImpactSheet,
    } = await import('./worksheets.js');

    if (data.analysisResult.modelAgreement && modelStats.length >= 2) {
      log.debug({ runId }, 'Building Model Agreement worksheet');
      buildModelAgreementSheet(workbook, data.analysisResult.modelAgreement);
    }

    if (data.analysisResult.contestedScenarios && data.analysisResult.contestedScenarios.length > 0) {
      log.debug({ runId }, 'Building Contested Scenarios worksheet');
      buildContestedScenariosSheet(workbook, data.analysisResult.contestedScenarios);
    }

    if (data.analysisResult.dimensionImpact && data.analysisResult.dimensionImpact.length > 0) {
      log.debug({ runId }, 'Building Dimension Impact worksheet');
      buildDimensionImpactSheet(workbook, data.analysisResult.dimensionImpact);
    }
  }

  // Build Methods worksheet (if enabled)
  if (includeMethods) {
    log.debug({ runId }, 'Building Methods worksheet');
    const warnings = collectWarnings(data);
    buildMethodsSheet(workbook, warnings);
  }

  // Serialize workbook to buffer
  log.debug({ runId }, 'Serializing workbook to buffer');
  const buffer = await workbookToBuffer(workbook);

  const duration = Date.now() - startTime;
  log.info(
    {
      runId,
      worksheetCount: workbook.worksheets.length,
      bufferSize: buffer.length,
      durationMs: duration,
    },
    'Excel export complete'
  );

  return {
    buffer,
    filename: generateXlsxFilename(runId),
    mimeType: XLSX_MIME_TYPE,
  };
}

// ============================================================================
// WARNING COLLECTION
// ============================================================================

/**
 * Collect data quality warnings for the Methods worksheet.
 *
 * @param data - Run export data
 * @returns Array of warning messages
 */
function collectWarnings(data: RunExportData): string[] {
  const warnings: string[] = [];

  // Check for low sample count
  const modelGroups = new Map<string, number>();
  for (const t of data.transcripts) {
    const count = modelGroups.get(t.modelId) ?? 0;
    modelGroups.set(t.modelId, count + 1);
  }

  for (const [model, count] of modelGroups.entries()) {
    if (count < 10) {
      warnings.push(`Low sample size for model "${model}": ${count} transcripts. Statistical measures may be unreliable.`);
    }
  }

  // Check for missing decision codes
  const missingDecisions = data.transcripts.filter(
    (t) => t.decisionCode === null || t.decisionCode === '' || t.decisionCode === 'error' || t.decisionCode === 'pending'
  ).length;

  if (missingDecisions > 0) {
    warnings.push(`${missingDecisions} transcript(s) have missing or invalid decision codes. These are excluded from statistical calculations.`);
  }

  // Check for single model (no comparison possible)
  if (modelGroups.size === 1) {
    warnings.push('Single model run. Model Agreement analysis is not applicable.');
  }

  // Check for missing analysis data
  if (!data.analysisResult) {
    warnings.push('Analysis results are not available. Some worksheets may be omitted.');
  }

  return warnings;
}

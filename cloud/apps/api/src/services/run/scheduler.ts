/**
 * Run Recovery Scheduler
 *
 * Manages the periodic recovery job that detects and recovers orphaned runs.
 * Uses setInterval for simplicity - PgBoss schedule() is for distributed cron,
 * but we only need one instance running recovery.
 */

import { createLogger } from '@valuerank/shared';
import { recoverOrphanedRuns, RECOVERY_INTERVAL_MS, runStartupRecovery } from './recovery.js';

const log = createLogger('services:run:scheduler');

let recoveryInterval: NodeJS.Timeout | null = null;
let isRecovering = false;

/**
 * Runs the recovery job, preventing concurrent executions.
 */
async function runRecoveryJob(): Promise<void> {
  if (isRecovering) {
    log.debug('Recovery already in progress, skipping');
    return;
  }

  isRecovering = true;
  try {
    const result = await recoverOrphanedRuns();

    if (result.detected.length > 0 || result.errors.length > 0) {
      log.info(
        {
          detected: result.detected.length,
          recovered: result.recovered.length,
          errors: result.errors.length,
        },
        'Recovery job completed'
      );
    }
  } catch (error) {
    log.error({ error }, 'Recovery job failed');
  } finally {
    isRecovering = false;
  }
}

/**
 * Starts the recovery scheduler.
 * Runs recovery immediately on startup, then every RECOVERY_INTERVAL_MS.
 */
export async function startRecoveryScheduler(): Promise<void> {
  if (recoveryInterval) {
    log.warn('Recovery scheduler already running');
    return;
  }

  log.info(
    { intervalMs: RECOVERY_INTERVAL_MS },
    'Starting recovery scheduler'
  );

  // Run startup recovery first
  try {
    const startupResult = await runStartupRecovery();
    if (startupResult.detected.length > 0) {
      log.info(
        {
          detected: startupResult.detected.length,
          recovered: startupResult.recovered.length,
          errors: startupResult.errors.length,
        },
        'Startup recovery completed'
      );
    }
  } catch (error) {
    log.error({ error }, 'Startup recovery failed');
    // Don't throw - we still want to start the scheduled job
  }

  // Schedule periodic recovery
  recoveryInterval = setInterval(runRecoveryJob, RECOVERY_INTERVAL_MS);

  log.info('Recovery scheduler started');
}

/**
 * Stops the recovery scheduler.
 */
export function stopRecoveryScheduler(): void {
  if (recoveryInterval) {
    clearInterval(recoveryInterval);
    recoveryInterval = null;
    log.info('Recovery scheduler stopped');
  }
}

/**
 * Checks if the recovery scheduler is running.
 */
export function isRecoverySchedulerRunning(): boolean {
  return recoveryInterval !== null;
}

/**
 * Manually triggers a recovery run (for debugging/admin).
 */
export async function triggerRecovery(): Promise<{
  detected: number;
  recovered: number;
  errors: number;
}> {
  const result = await recoverOrphanedRuns();
  return {
    detected: result.detected.length,
    recovered: result.recovered.length,
    errors: result.errors.length,
  };
}

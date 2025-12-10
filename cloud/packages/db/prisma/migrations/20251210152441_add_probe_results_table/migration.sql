-- CreateEnum
CREATE TYPE "ProbeResultStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "probe_results" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "status" "ProbeResultStatus" NOT NULL,
    "transcript_id" TEXT,
    "duration_ms" INTEGER,
    "token_count" INTEGER,
    "error_code" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "probe_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "probe_results_run_id_idx" ON "probe_results"("run_id");

-- CreateIndex
CREATE INDEX "probe_results_scenario_id_idx" ON "probe_results"("scenario_id");

-- CreateIndex
CREATE INDEX "probe_results_model_id_idx" ON "probe_results"("model_id");

-- CreateIndex
CREATE INDEX "probe_results_status_idx" ON "probe_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "probe_results_run_id_scenario_id_model_id_key" ON "probe_results"("run_id", "scenario_id", "model_id");

-- AddForeignKey
ALTER TABLE "probe_results" ADD CONSTRAINT "probe_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "probe_results" ADD CONSTRAINT "probe_results_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

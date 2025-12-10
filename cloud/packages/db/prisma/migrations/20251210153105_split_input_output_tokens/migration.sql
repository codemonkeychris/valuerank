/*
  Warnings:

  - You are about to drop the column `token_count` on the `probe_results` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "probe_results" DROP COLUMN "token_count",
ADD COLUMN     "input_tokens" INTEGER,
ADD COLUMN     "output_tokens" INTEGER;

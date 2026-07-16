-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "nssfEmployeeDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "nssfEmployerContribution" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payeDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0;

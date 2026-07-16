/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `PayrollRun` table. All the data in the column will be lost.
  - You are about to drop the column `approvedById` on the `PayrollRun` table. All the data in the column will be lost.
  - Added the required column `basePay` to the `PayrollRun` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PayrollRun" DROP CONSTRAINT "PayrollRun_approvedById_fkey";

-- AlterTable
ALTER TABLE "PayrollRun" DROP COLUMN "approvedAt",
DROP COLUMN "approvedById",
ADD COLUMN     "basePay" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "financeApprovedAt" TIMESTAMP(3),
ADD COLUMN     "financeApprovedById" INTEGER,
ADD COLUMN     "hrApprovedAt" TIMESTAMP(3),
ADD COLUMN     "hrApprovedById" INTEGER,
ADD COLUMN     "lateDaysCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
ADD COLUMN     "overtimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unpaidLeaveDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unpaidLeaveDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_hrApprovedById_fkey" FOREIGN KEY ("hrApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_financeApprovedById_fkey" FOREIGN KEY ("financeApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

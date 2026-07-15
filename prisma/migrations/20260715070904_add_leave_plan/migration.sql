-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "requiresPlan" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LeavePlan" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "plannedEndDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeavePlan_employeeId_idx" ON "LeavePlan"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePlan_employeeId_leaveTypeId_year_key" ON "LeavePlan"("employeeId", "leaveTypeId", "year");

-- AddForeignKey
ALTER TABLE "LeavePlan" ADD CONSTRAINT "LeavePlan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePlan" ADD CONSTRAINT "LeavePlan_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

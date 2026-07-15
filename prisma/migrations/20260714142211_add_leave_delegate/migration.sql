-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "delegateId" INTEGER;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

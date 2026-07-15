-- AlterEnum
BEGIN;
CREATE TYPE "LeaveRequestStatus_new" AS ENUM ('PENDING_SUPERVISOR', 'PENDING_HR', 'APPROVED', 'DECLINED');
ALTER TABLE "public"."LeaveRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" TYPE "LeaveRequestStatus_new" USING ("status"::text::"LeaveRequestStatus_new");
ALTER TYPE "LeaveRequestStatus" RENAME TO "LeaveRequestStatus_old";
ALTER TYPE "LeaveRequestStatus_new" RENAME TO "LeaveRequestStatus";
DROP TYPE "public"."LeaveRequestStatus_old";
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING_SUPERVISOR';
COMMIT;

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_approverId_fkey";

-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "approverId",
DROP COLUMN "decidedAt",
ADD COLUMN     "hrApproverId" INTEGER,
ADD COLUMN     "hrDecidedAt" TIMESTAMP(3),
ADD COLUMN     "supervisorApproverId" INTEGER,
ADD COLUMN     "supervisorDecidedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING_SUPERVISOR';

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "tracksBalance" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_supervisorApproverId_fkey" FOREIGN KEY ("supervisorApproverId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_hrApproverId_fkey" FOREIGN KEY ("hrApproverId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;


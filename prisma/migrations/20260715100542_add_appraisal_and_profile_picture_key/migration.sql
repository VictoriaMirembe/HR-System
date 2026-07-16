/*
  Warnings:

  - You are about to drop the column `profilePictureUrl` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "profilePictureUrl",
ADD COLUMN     "nextAppraisalDate" TIMESTAMP(3),
ADD COLUMN     "profilePictureKey" TEXT;

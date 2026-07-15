import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { LeaveRequestForm } from "./leave-request-form";

export default async function NewLeaveRequestPage() {
  const session = await verifySession();

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.employeeId },
    select: { gender: true },
  });

  const leaveTypes = await prisma.leaveType.findMany({
    orderBy: { name: "asc" },
  });

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId: session.employeeId },
  });
  const remainingByLeaveTypeId = new Map(
    balances.map((balance) => [balance.leaveTypeId, Number(balance.remainingDays)])
  );

  // Only offer leave types this employee is actually eligible for —
  // Maternity Leave / Paternity Leave are filtered by gender (see
  // LeaveType.restrictedToGender). An employee with gender unset simply
  // won't see either until HR sets it on their profile.
  const options = leaveTypes
    .filter(
      (leaveType) =>
        !leaveType.restrictedToGender || leaveType.restrictedToGender === employee.gender
    )
    .map((leaveType) => ({
      id: leaveType.id,
      name: leaveType.name,
      remaining: leaveType.tracksBalance
        ? (remainingByLeaveTypeId.get(leaveType.id) ?? 0)
        : null,
    }));

  const potentialDelegates = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE", id: { not: session.employeeId } },
    select: { id: true, fullName: true, jobTitle: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Request leave</h1>
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
      </div>
      <LeaveRequestForm leaveTypes={options} potentialDelegates={potentialDelegates} />
    </div>
  );
}

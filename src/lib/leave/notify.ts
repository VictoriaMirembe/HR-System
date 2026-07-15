import { prisma } from "@/lib/prisma";
import { emailProvider } from "@/lib/email";

// "Employee: get notified by email on decision" (US-003) — interpreted as
// the decisions that actually conclude something for the employee: a
// decline (at either stage, since it ends the request) or a final
// approval. The intermediate supervisor-approve → HR-pending transition
// doesn't email the employee; it's not a decision yet, just routing.

async function notifyHrAdministrators(subject: string, body: string): Promise<void> {
  const hrUsers = await prisma.user.findMany({
    where: { role: { name: "HR Administrator" }, isActive: true },
    select: { email: true },
  });
  await Promise.all(
    hrUsers.map((user) => emailProvider.send({ to: user.email, subject, body }))
  );
}

export async function notifyLeaveRequestSubmitted(params: {
  employeeName: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  lineManagerId: number | null;
}): Promise<void> {
  const dateRange = `${params.startDate.toLocaleDateString()} – ${params.endDate.toLocaleDateString()}`;

  if (params.lineManagerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: params.lineManagerId },
      select: { workEmail: true },
    });
    if (manager) {
      await emailProvider.send({
        to: manager.workEmail,
        subject: `Leave request from ${params.employeeName}`,
        body: `${params.employeeName} has requested ${params.leaveTypeName} for ${dateRange}. Review it in the Pending Approvals list.`,
      });
    }
    return;
  }

  // No line manager on file (e.g. top of the org chart) — the request
  // skips straight to the HR sign-off stage, so notify HR directly.
  await notifyHrAdministrators(
    `Leave request from ${params.employeeName} (no line manager on file)`,
    `${params.employeeName} has requested ${params.leaveTypeName} for ${dateRange}. They have no line manager on file, so this needs HR sign-off directly.`
  );
}

// Called when a supervisor approves — the request moves to PENDING_HR and
// HR needs to know it's now awaiting their sign-off.
export async function notifyHrPendingSignOff(params: {
  employeeName: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  const dateRange = `${params.startDate.toLocaleDateString()} – ${params.endDate.toLocaleDateString()}`;
  await notifyHrAdministrators(
    `Leave request from ${params.employeeName} awaiting HR sign-off`,
    `${params.employeeName}'s request for ${params.leaveTypeName} (${dateRange}) was approved by their supervisor and now needs HR sign-off.`
  );
}

export async function notifyLeaveDecision(params: {
  employeeWorkEmail: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  decision: "APPROVED" | "DECLINED";
  decisionReason: string | null;
}): Promise<void> {
  const dateRange = `${params.startDate.toLocaleDateString()} – ${params.endDate.toLocaleDateString()}`;
  const body =
    params.decision === "APPROVED"
      ? `Your request for ${params.leaveTypeName} (${dateRange}) has been approved.`
      : `Your request for ${params.leaveTypeName} (${dateRange}) has been declined.\n\nReason: ${params.decisionReason}`;

  await emailProvider.send({
    to: params.employeeWorkEmail,
    subject: `Leave request ${params.decision === "APPROVED" ? "approved" : "declined"}`,
    body,
  });
}

// Only sent once a request clears final HR sign-off — telling a delegate
// about a request that might still get declined would be premature.
export async function notifyDelegate(params: {
  delegateId: number;
  employeeName: string;
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  const delegate = await prisma.employee.findUnique({
    where: { id: params.delegateId },
    select: { workEmail: true },
  });
  if (!delegate) return;

  const dateRange = `${params.startDate.toLocaleDateString()} – ${params.endDate.toLocaleDateString()}`;
  await emailProvider.send({
    to: delegate.workEmail,
    subject: `You're covering for ${params.employeeName} (${dateRange})`,
    body: `${params.employeeName}'s leave request has been approved for ${dateRange}. They've named you as their delegate while they're away.`,
  });
}

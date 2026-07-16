import { prisma } from "@/lib/prisma";
import { emailProvider } from "@/lib/email";

// "Saving profile changes logs the change and notifies HR for review"
// (US-HR-002) — the change takes effect immediately (see
// PATCH /api/employees/me), this just tells HR it happened so they can
// review/override it. Mirrors the notifyHrAdministrators pattern in
// src/lib/leave/notify.ts.
export async function notifyHrOfProfileUpdate(params: {
  employeeName: string;
  changedFields: string[];
}): Promise<void> {
  const hrUsers = await prisma.user.findMany({
    where: { role: { name: "HR Administrator" }, isActive: true },
    select: { email: true },
  });

  await Promise.all(
    hrUsers.map((user) =>
      emailProvider.send({
        to: user.email,
        subject: `${params.employeeName} updated their profile`,
        body: `${params.employeeName} updated the following on their own profile: ${params.changedFields.join(", ")}.\n\nReview it in the employee directory — HR can always override employee-edited fields.`,
      })
    )
  );
}

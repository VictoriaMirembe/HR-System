import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { changePasswordSchema } from "@/lib/validation/change-password";
import { writeAuditLog } from "@/lib/audit";

// POST /api/employees/me/password — every logged-in user can change their
// own password (no special permission needed, same as the rest of "My
// Profile"). Requires the current password so a hijacked/left-open session
// can't be used to silently lock the real owner out.
export async function POST(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { employeeId: session.employeeId },
    include: { employee: { select: { fullName: true } } },
  });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const currentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentValid) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: user.employee.fullName,
      action: "auth.password_changed",
      entity: "User",
      entityId: String(user.id),
    });
  });

  return NextResponse.json({ ok: true });
}

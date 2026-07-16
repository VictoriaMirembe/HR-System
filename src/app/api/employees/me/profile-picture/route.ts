import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  ALLOWED_PROFILE_PICTURE_TYPES,
  MAX_PROFILE_PICTURE_SIZE_BYTES,
} from "@/lib/employees/config";
import { generateProfilePictureStorageKey } from "@/lib/employees/storage-key";
import { storageProvider } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

// POST /api/employees/me/profile-picture — self-service, any authenticated
// employee replacing their own picture. The previous picture (if any) is
// deleted from storage after the new one is successfully saved and
// committed, so a failure partway through never leaves the employee with
// no picture at all.
export async function POST(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_UPDATE_OWN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }
  if (!ALLOWED_PROFILE_PICTURE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WebP images are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_PROFILE_PICTURE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_PROFILE_PICTURE_SIZE_BYTES / (1024 * 1024)}MB limit.` },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  const existing = await prisma.employee.findUniqueOrThrow({
    where: { id: session.employeeId },
    select: { fullName: true, profilePictureKey: true },
  });

  const storageKey = generateProfilePictureStorageKey(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await storageProvider.save(storageKey, buffer);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: session.employeeId },
        data: { profilePictureKey: storageKey },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        actorName: existing.fullName,
        action: "employee.profile_picture_update",
        entity: "Employee",
        entityId: String(session.employeeId),
      });
    });
  } catch (error) {
    await storageProvider.delete(storageKey).catch(() => {});
    throw error;
  }

  if (existing.profilePictureKey) {
    await storageProvider.delete(existing.profilePictureKey).catch(() => {});
  }

  return NextResponse.json({ profilePictureKey: storageKey });
}

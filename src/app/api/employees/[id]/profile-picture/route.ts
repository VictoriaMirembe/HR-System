import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { storageProvider } from "@/lib/storage";

// GET /api/employees/[id]/profile-picture — served to any authenticated
// user (not gated behind employee:read's row-level scoping — an avatar
// image is low-sensitivity compared to the rest of an employee record,
// and showing colleagues' names/pictures across the org in things like
// the leave delegate picker is expected).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid employee id." }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { profilePictureKey: true },
  });
  if (!employee?.profilePictureKey) {
    return NextResponse.json({ error: "No profile picture set." }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await storageProvider.read(employee.profilePictureKey);
  } catch {
    return NextResponse.json({ error: "File is missing from storage." }, { status: 500 });
  }

  const ext = employee.profilePictureKey.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}

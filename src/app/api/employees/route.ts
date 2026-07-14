import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createEmployeeSchema } from "@/lib/validation/employee";
import { generateEmployeeId } from "@/lib/employee-id";
import { writeAuditLog } from "@/lib/audit";
import { emailProvider } from "@/lib/email";
import { employeeListWhere } from "@/lib/employee-scope";
import type { Prisma } from "@/generated/prisma/client";

const SETUP_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// GET /api/employees?search=&department=&status=
// Directory listing, scoped by role (see src/lib/employee-scope.ts).
export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search")?.trim();
  const department = searchParams.get("department")?.trim();
  const status = searchParams.get("status");

  const where: Prisma.EmployeeWhereInput = {
    ...employeeListWhere(session),
    ...(department ? { department } : {}),
    ...(status === "ACTIVE" || status === "ARCHIVED"
      ? { employmentStatus: status }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { employeeId: { contains: search, mode: "insensitive" } },
            { workEmail: { contains: search, mode: "insensitive" } },
            { jobTitle: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      jobTitle: true,
      department: true,
      workEmail: true,
      employmentStatus: true,
      startDate: true,
      lineManager: { select: { id: true, fullName: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ employees });
}

// POST /api/employees — HR-only. Creates the Employee record, a linked
// User with no password yet, and emails a one-time setup link. All three
// steps happen in one transaction plus one audit log write, per the
// acceptance criteria ("new employee record is immediately usable" and
// "all actions logged to the audit trail").
export async function POST(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.EMPLOYEE_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const [personalEmailTaken, workEmailTaken] = await Promise.all([
    prisma.employee.findUnique({ where: { personalEmail: data.personalEmail } }),
    prisma.employee.findUnique({ where: { workEmail: data.workEmail } }),
  ]);
  if (personalEmailTaken) {
    return NextResponse.json(
      { error: "Personal email already in use." },
      { status: 409 }
    );
  }
  if (workEmailTaken) {
    return NextResponse.json(
      { error: "Work email already in use." },
      { status: 409 }
    );
  }

  if (data.lineManagerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: data.lineManagerId },
    });
    if (!manager) {
      return NextResponse.json(
        { error: "Selected line manager does not exist." },
        { status: 400 }
      );
    }
  }

  const employeeRole = await prisma.role.findUnique({
    where: { name: "Employee" },
  });
  if (!employeeRole) {
    return NextResponse.json(
      { error: "Default 'Employee' role is not seeded. Run `npm run db:seed`." },
      { status: 500 }
    );
  }

  const actor = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { fullName: true },
  });

  const setupToken = crypto.randomBytes(32).toString("hex");
  const setupTokenExpiresAt = new Date(Date.now() + SETUP_LINK_TTL_MS);

  const employee = await prisma.$transaction(async (tx) => {
    const employeeId = await generateEmployeeId(tx);

    const created = await tx.employee.create({
      data: {
        employeeId,
        fullName: data.fullName,
        personalEmail: data.personalEmail,
        workEmail: data.workEmail,
        dateOfBirth: data.dateOfBirth,
        jobTitle: data.jobTitle,
        department: data.department,
        lineManagerId: data.lineManagerId ?? null,
        startDate: data.startDate,
        salary: data.salary,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        tin: data.tin,
        nssfNumber: data.nssfNumber,
        contractType: data.contractType,
        contractStart: data.contractStart,
        contractEnd: data.contractEnd ?? null,
      },
    });

    await tx.user.create({
      data: {
        email: data.workEmail,
        roleId: employeeRole.id,
        employeeId: created.id,
        setupToken,
        setupTokenExpiresAt,
      },
    });

    await writeAuditLog(tx, {
      actorId: session.userId,
      actorName: actor?.fullName ?? "Unknown",
      action: "employee.create",
      entity: "Employee",
      entityId: String(created.id),
      metadata: { employeeId: created.employeeId },
    });

    return created;
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const setupUrl = `${appUrl}/setup/${setupToken}`;
  await emailProvider.send({
    to: data.personalEmail,
    subject: "Welcome to Media Challenge Initiative",
    body: `Hi ${data.fullName},\n\nYour employee profile has been created (ID: ${employee.employeeId}).\nSet up your account password to get started: ${setupUrl}\n\nThis link expires in 7 days.`,
  });

  return NextResponse.json({ employee }, { status: 201 });
}

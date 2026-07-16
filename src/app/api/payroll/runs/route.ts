import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalSession } from "@/lib/dal";
import { hasPermission } from "@/lib/rbac/check";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { payrollRunListWhere } from "@/lib/payroll-scope";
import type { Prisma, $Enums } from "@/generated/prisma/client";

// GET /api/payroll/runs?period=&status= — scoped by role (see payroll-scope.ts).
export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, PERMISSIONS.PAYROLL_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const period = searchParams.get("period");
  const status = searchParams.get("status");
  const validStatuses = ["DRAFT", "HR_APPROVED", "APPROVED_FOR_PAYMENT"];

  const where: Prisma.PayrollRunWhereInput = {
    ...payrollRunListWhere(session),
    ...(period ? { period } : {}),
    ...(status && validStatuses.includes(status)
      ? { status: status as $Enums.PayrollStatus }
      : {}),
  };

  const runs = await prisma.payrollRun.findMany({
    where,
    include: {
      employee: { select: { id: true, fullName: true, department: true } },
    },
    orderBy: [{ period: "desc" }, { employee: { fullName: "asc" } }],
  });

  return NextResponse.json({ runs });
}

// Seeds reference data every environment needs to be usable: RBAC roles and
// their permissions, common leave types, and one bootstrap HR Administrator
// account so there's a way to log in and start using the system at all.
//
// Run with: npm run db:seed  (or automatically after `prisma migrate reset`)
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/rbac/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Employee: "Standard staff member; can view and manage their own records.",
  "Line Manager": "Manages direct reports; approves their leave requests.",
  "HR Administrator": "Full administrative access to employee records.",
  "Finance Officer": "Verifies and approves payroll for payment.",
  "Senior Management": "Organization-wide oversight and reporting access.",
};

const LEAVE_TYPES: { name: string; defaultAnnualDays: number }[] = [
  { name: "Annual Leave", defaultAnnualDays: 21 },
  { name: "Sick Leave", defaultAnnualDays: 10 },
  { name: "Maternity/Paternity Leave", defaultAnnualDays: 60 },
  { name: "Unpaid Leave", defaultAnnualDays: 0 },
];

const BOOTSTRAP_ADMIN = {
  fullName: "System Administrator",
  personalEmail: "admin.personal@example.com",
  workEmail: "admin@mediachallenge.org",
  password: "ChangeMe123!",
};

async function main() {
  console.log("Seeding permissions...");
  for (const key of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  console.log("Seeding roles and role-permission assignments...");
  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {
        permissions: {
          set: [], // reset then reconnect, so removed permissions actually get removed on re-seed
          connect: permissionKeys.map((key) => ({ key })),
        },
      },
      create: {
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName],
        permissions: { connect: permissionKeys.map((key) => ({ key })) },
      },
    });
  }

  console.log("Seeding leave types...");
  for (const leaveType of LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { name: leaveType.name },
      update: { defaultAnnualDays: leaveType.defaultAnnualDays },
      create: leaveType,
    });
  }

  console.log("Seeding bootstrap HR Administrator...");
  const hrRole = await prisma.role.findUniqueOrThrow({
    where: { name: "HR Administrator" },
  });

  const existingAdmin = await prisma.user.findUnique({
    where: { email: BOOTSTRAP_ADMIN.workEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(BOOTSTRAP_ADMIN.password, 12);

    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeId: "MCI-0000-0001",
          fullName: BOOTSTRAP_ADMIN.fullName,
          personalEmail: BOOTSTRAP_ADMIN.personalEmail,
          workEmail: BOOTSTRAP_ADMIN.workEmail,
          dateOfBirth: new Date("1990-01-01"),
          jobTitle: "HR Administrator",
          department: "Human Resources",
          startDate: new Date(),
          salary: 0,
          bankName: "N/A",
          bankAccountNumber: "N/A",
          tin: "N/A",
          nssfNumber: "N/A",
          contractType: "FULL_TIME",
          contractStart: new Date(),
        },
      });

      await tx.user.create({
        data: {
          email: BOOTSTRAP_ADMIN.workEmail,
          passwordHash,
          roleId: hrRole.id,
          employeeId: employee.id,
        },
      });
    });

    console.log(
      `\nBootstrap admin created:\n  email:    ${BOOTSTRAP_ADMIN.workEmail}\n  password: ${BOOTSTRAP_ADMIN.password}\n  (change this after first login)\n`
    );
  } else {
    console.log("Bootstrap admin already exists, skipping.");
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

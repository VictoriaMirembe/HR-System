"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export type FormState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Password is required." }),
});

// Server Action backing the login form. Runs entirely on the server, so the
// password never touches client-side JavaScript beyond the browser's own
// form submission — see the "Sign-up and login functionality" pattern in
// the Next.js auth guide.
export async function login(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: true } }, employee: true },
  });

  // Same message whether the email doesn't exist or the password is wrong —
  // distinguishing the two would let an attacker enumerate valid emails.
  const invalidCredentials: FormState = { error: "Invalid email or password." };

  if (!user || !user.passwordHash || !user.isActive) {
    return invalidCredentials;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    return invalidCredentials;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await writeAuditLog(tx, {
      actorId: user.id,
      actorName: user.employee.fullName,
      action: "auth.login",
      entity: "User",
      entityId: String(user.id),
    });
  });

  await createSession({
    userId: user.id,
    employeeId: user.employeeId,
    roleName: user.role.name,
    permissions: user.role.permissions.map((p) => p.key),
  });

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

const completeSetupSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// Consumes the one-time setup link sent in the welcome email when HR
// creates an employee (see POST /api/employees). Sets the employee's
// initial password and logs them straight in.
export async function completeSetup(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = completeSetupSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { token, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { setupToken: token },
    include: { role: { include: { permissions: true } }, employee: true },
  });

  if (
    !user ||
    !user.setupTokenExpiresAt ||
    user.setupTokenExpiresAt < new Date()
  ) {
    return {
      error:
        "This setup link is invalid or has expired. Contact HR for a new one.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, setupToken: null, setupTokenExpiresAt: null },
    });
    await writeAuditLog(tx, {
      actorId: user.id,
      actorName: user.employee.fullName,
      action: "auth.setup_completed",
      entity: "User",
      entityId: String(user.id),
    });
  });

  await createSession({
    userId: user.id,
    employeeId: user.employeeId,
    roleName: user.role.name,
    permissions: user.role.permissions.map((p) => p.key),
  });

  redirect("/dashboard");
}

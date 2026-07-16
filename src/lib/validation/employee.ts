import { z } from "zod";

// Server-side validation for creating an employee (US-HR-001 acceptance
// criteria). This is the source of truth — the client form re-implements a
// looser version for instant feedback, but this schema is what actually
// gates what reaches the database, since client-side checks can always be
// bypassed by calling the API directly.
export const contractTypeValues = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
] as const;

// Deliberately minimal — see the Gender enum comment in schema.prisma. Only
// used to gate Maternity/Paternity Leave eligibility.
export const genderValues = ["MALE", "FEMALE"] as const;

// MCI's fixed set of departments — a closed list (not free text) so
// filtering and reporting by department is reliable rather than fractured
// by typos/casing (earlier free-text data had "Programes and
// Communications" and "Human Resources" as separate values from what's
// used here).
export const departmentValues = [
  "Finance",
  "Newsroom",
  "People and Culture (Human Resource)",
  "Production",
  "Programmes and Communications",
  "Research and Learning",
] as const;

// Base field shape, kept separate from `.refine()` cross-field checks so it
// can also be used as `.partial()` for updates below — zod's refined
// schemas (ZodEffects) don't support `.partial()` directly.
export const employeeFieldsSchema = z.object({
  fullName: z.string().trim().min(2, { error: "Full name is required." }),
  personalEmail: z.email({ error: "Enter a valid personal email." }),
  workEmail: z.email({ error: "Enter a valid work email." }),
  dateOfBirth: z.coerce.date({ error: "Enter a valid date of birth." }),
  gender: z.enum(genderValues, { error: "Select a gender." }),
  jobTitle: z.string().trim().min(1, { error: "Job title is required." }),
  department: z.enum(departmentValues, { error: "Select a department." }),
  lineManagerId: z.coerce.number().int().positive().nullable().optional(),
  startDate: z.coerce.date({ error: "Enter a valid start date." }),
  salary: z.coerce
    .number()
    .positive({ error: "Salary must be a positive number." }),
  bankName: z.string().trim().min(1, { error: "Bank name is required." }),
  bankAccountNumber: z
    .string()
    .trim()
    .min(1, { error: "Bank account number is required." }),
  tin: z.string().trim().min(1, { error: "TIN is required." }),
  nssfNumber: z.string().trim().min(1, { error: "NSSF number is required." }),
  contractType: z.enum(contractTypeValues, {
    error: "Select a contract type.",
  }),
  contractStart: z.coerce.date({ error: "Enter a valid contract start date." }),
  contractEnd: z.coerce.date().nullable().optional(),
  nextAppraisalDate: z.coerce.date().nullable().optional(),
  // Next of kin and health status — HR-only, optional (see schema.prisma
  // comment). No cross-field requirement that all three next-of-kin
  // fields be filled together; HR can capture what's available.
  nextOfKinName: z.string().trim().nullable().optional(),
  nextOfKinRelationship: z.string().trim().nullable().optional(),
  nextOfKinPhone: z.string().trim().nullable().optional(),
  healthStatus: z.string().trim().nullable().optional(),
});

// System role (Employee / Line Manager / HR Administrator / Finance
// Officer / Senior Management) lives on User, not Employee — kept as a
// separate field rather than folded into employeeFieldsSchema, since that
// schema's shape is passed straight into `tx.employee.update({ data })` in
// the API routes and `roleId` isn't a column on the Employee table.
// Optional: if omitted at creation, the route defaults to the "Employee"
// role; if omitted on update, the employee's role is left unchanged.
const roleIdSchema = z.coerce.number().int().positive();

export const createEmployeeSchema = employeeFieldsSchema
  .extend({ roleId: roleIdSchema.optional() })
  .refine((data) => data.personalEmail !== data.workEmail, {
    error: "Personal and work email must be different.",
    path: ["workEmail"],
  })
  .refine((data) => data.startDate >= data.dateOfBirth, {
    error: "Start date cannot be before date of birth.",
    path: ["startDate"],
  });

// HR editing an existing employee: every field optional, only the ones
// present in the request body are validated and written.
export const updateEmployeeSchema = employeeFieldsSchema
  .partial()
  .extend({ roleId: roleIdSchema.optional() });

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

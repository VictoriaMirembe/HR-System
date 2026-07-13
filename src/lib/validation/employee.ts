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

export const createEmployeeSchema = z
  .object({
    fullName: z.string().trim().min(2, { error: "Full name is required." }),
    personalEmail: z.email({ error: "Enter a valid personal email." }),
    workEmail: z.email({ error: "Enter a valid work email." }),
    dateOfBirth: z.coerce.date({ error: "Enter a valid date of birth." }),
    jobTitle: z.string().trim().min(1, { error: "Job title is required." }),
    department: z.string().trim().min(1, { error: "Department is required." }),
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
  })
  .refine((data) => data.personalEmail !== data.workEmail, {
    error: "Personal and work email must be different.",
    path: ["workEmail"],
  })
  .refine((data) => data.startDate >= data.dateOfBirth, {
    error: "Start date cannot be before date of birth.",
    path: ["startDate"],
  });

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

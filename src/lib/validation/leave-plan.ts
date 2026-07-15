import { z } from "zod";

export const createLeavePlanSchema = z
  .object({
    leaveTypeId: z.coerce.number().int().positive({ error: "Select a leave type." }),
    year: z.coerce
      .number()
      .int()
      .min(2020, { error: "Enter a valid year." })
      .max(2100, { error: "Enter a valid year." }),
    plannedStartDate: z.coerce.date({ error: "Enter a valid planned start date." }),
    plannedEndDate: z.coerce.date({ error: "Enter a valid planned end date." }),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.plannedEndDate >= data.plannedStartDate, {
    error: "Planned end date cannot be before the planned start date.",
    path: ["plannedEndDate"],
  })
  .refine((data) => data.plannedStartDate.getFullYear() === data.year, {
    error: "Planned start date must fall within the selected year.",
    path: ["plannedStartDate"],
  });

export type CreateLeavePlanInput = z.infer<typeof createLeavePlanSchema>;

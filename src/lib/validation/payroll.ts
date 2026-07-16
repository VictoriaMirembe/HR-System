import { z } from "zod";
import { isValidPeriod } from "@/lib/payroll/period";

export const generatePayrollSchema = z.object({
  period: z.string().refine(isValidPeriod, { error: "Period must be in YYYY-MM format." }),
});

export const createPayrollAdjustmentSchema = z.object({
  amount: z.coerce.number().refine((n) => n !== 0, {
    error: "Amount cannot be zero — positive for a bonus, negative for a deduction.",
  }),
  reason: z.string().trim().min(1, { error: "A reason is required." }),
});

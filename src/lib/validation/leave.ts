import { z } from "zod";

export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: z.coerce.number().int().positive({ error: "Select a leave type." }),
    startDate: z.coerce.date({ error: "Enter a valid start date." }),
    endDate: z.coerce.date({ error: "Enter a valid end date." }),
    reason: z.string().trim().min(1, { error: "A reason is required." }),
    // Optional colleague covering while the requester is away — "if you
    // have one", per the acceptance criteria this was added for.
    delegateId: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    error: "End date cannot be before start date.",
    path: ["endDate"],
  });

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const decideLeaveRequestSchema = z
  .object({
    decision: z.enum(["APPROVE", "DECLINE"], { error: "Select approve or decline." }),
    reason: z.string().trim().optional(),
  })
  .refine((data) => data.decision !== "DECLINE" || !!data.reason, {
    error: "A reason is required when declining.",
    path: ["reason"],
  });

export type DecideLeaveRequestInput = z.infer<typeof decideLeaveRequestSchema>;

import { z } from "zod";

// Deliberately narrow — only the fields the acceptance criteria says an
// employee may edit about themselves (mobile, personal email, emergency
// contact). Job title, department, salary, bank details etc. are NOT
// here, so even if a client sent them in the request body, this schema
// strips them out before anything reaches the database — the HR-only
// route (PATCH /api/employees/[id]) is the only path that can touch those.
export const selfServiceProfileSchema = z.object({
  mobile: z.string().trim().min(1, { error: "Mobile number is required." }),
  personalEmail: z.email({ error: "Enter a valid personal email." }),
  emergencyContactName: z
    .string()
    .trim()
    .min(1, { error: "Emergency contact name is required." }),
  emergencyContactPhone: z
    .string()
    .trim()
    .min(1, { error: "Emergency contact phone is required." }),
});

export type SelfServiceProfileInput = z.infer<typeof selfServiceProfileSchema>;

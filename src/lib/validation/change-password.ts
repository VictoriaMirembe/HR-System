import { z } from "zod";
import { checkPasswordPolicy } from "@/lib/security/password-policy";

// Shared password policy (length, complexity, common-password blocklist)
// lives in src/lib/security/password-policy.ts — same rules used by the
// initial account-setup flow (completeSetupSchema in
// src/app/actions/auth.ts), not duplicated here.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Current password is required." }),
    newPassword: z.string(),
    confirmNewPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    const result = checkPasswordPolicy(data.newPassword);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.reason, path: ["newPassword"] });
    }
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    error: "New passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    error: "New password must be different from your current password.",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

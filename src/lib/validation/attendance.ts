import { z } from "zod";

export const clockInSchema = z.object({
  method: z.enum(["MANUAL", "GEOFENCE", "BIOMETRIC"], {
    error: "Select a valid clock-in method.",
  }),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export type ClockInInput = z.infer<typeof clockInSchema>;

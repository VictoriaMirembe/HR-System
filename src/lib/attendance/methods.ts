import { distanceMeters } from "@/lib/attendance/geo";
import { OFFICE_LOCATION } from "@/lib/attendance/config";
import type { $Enums } from "@/generated/prisma/client";

export type AttendanceMethod = $Enums.AttendanceMethod; // "GEOFENCE" | "BIOMETRIC" | "MANUAL"

export type ClockInContext = {
  coordinates?: { lat: number; lng: number };
};

export type VerifyResult = { ok: true } | { ok: false; error: string };

// One implementation per AttendanceMethod. The clock-in route (see
// src/app/api/attendance/clock-in/route.ts) looks up the provider by the
// method the client requests and calls verify() — it never branches on the
// method name itself. Adding a real biometric device integration later
// means implementing this interface and registering it in
// CLOCK_IN_METHODS below; nothing else in the request path changes.
export interface ClockInMethodProvider {
  verify(context: ClockInContext): Promise<VerifyResult>;
}

class ManualMethod implements ClockInMethodProvider {
  async verify(): Promise<VerifyResult> {
    // Self-attested: the employee is trusted to only clock in when actually
    // starting work. No geolocation or device check.
    return { ok: true };
  }
}

class GeofenceMethod implements ClockInMethodProvider {
  async verify(context: ClockInContext): Promise<VerifyResult> {
    if (!context.coordinates) {
      return {
        ok: false,
        error: "Location is required to clock in with geofencing.",
      };
    }
    const distance = distanceMeters(context.coordinates, OFFICE_LOCATION);
    if (distance > OFFICE_LOCATION.radiusMeters) {
      return {
        ok: false,
        error: `You're ${Math.round(distance)}m from the office — outside the ${OFFICE_LOCATION.radiusMeters}m clock-in radius.`,
      };
    }
    return { ok: true };
  }
}

class BiometricMethod implements ClockInMethodProvider {
  async verify(): Promise<VerifyResult> {
    // No physical biometric device is integrated in this build. This stub
    // exists so the pluggable interface has a concrete "not implemented
    // yet" slot to fill in later, rather than requiring a new interface to
    // be invented when a device integration is added.
    return {
      ok: false,
      error: "Biometric clock-in is not yet available.",
    };
  }
}

export const CLOCK_IN_METHODS: Record<AttendanceMethod, ClockInMethodProvider> = {
  MANUAL: new ManualMethod(),
  GEOFENCE: new GeofenceMethod(),
  BIOMETRIC: new BiometricMethod(),
};

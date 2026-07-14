"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OpenRecord = { id: number; clockIn: string; method: string } | null;

// Shared between the dashboard and the /attendance page. Offers both
// clock-in methods actually implemented (MANUAL, GEOFENCE) — BIOMETRIC
// exists as a provider stub server-side (src/lib/attendance/methods.ts)
// but has no UI entry point since there's no device to integrate yet.
export function ClockWidget({ initialOpenRecord }: { initialOpenRecord: OpenRecord }) {
  const router = useRouter();
  const [openRecord, setOpenRecord] = useState(initialOpenRecord);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function clockIn(method: "MANUAL" | "GEOFENCE") {
    setError(null);
    setSubmitting(true);

    let coordinates: { lat: number; lng: number } | undefined;
    if (method === "GEOFENCE") {
      try {
        const position = await getCurrentPosition();
        coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch {
        setError(
          "Couldn't get your location. Check browser location permissions and try again."
        );
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/attendance/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, coordinates }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to clock in.");
        setSubmitting(false);
        return;
      }
      setOpenRecord(body.record);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function clockOut() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/clock-out", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to clock out.");
        setSubmitting(false);
        return;
      }
      setOpenRecord(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-sky-700">
        Time tracker
        <span className="mt-1 block h-0.5 w-8 rounded-full bg-sky-400" />
      </h2>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {openRecord ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Clocked in at{" "}
            <span className="font-medium text-slate-900">
              {new Date(openRecord.clockIn).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>{" "}
            <span className="text-slate-400">({openRecord.method})</span>
          </p>
          <button
            type="button"
            onClick={clockOut}
            disabled={submitting}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? "Clocking out..." : "Clock out"}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => clockIn("MANUAL")}
            disabled={submitting}
            className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-900/10 transition hover:bg-sky-500 disabled:opacity-60"
          >
            {submitting ? "Clocking in..." : "Clock in"}
          </button>
          <button
            type="button"
            onClick={() => clockIn("GEOFENCE")}
            disabled={submitting}
            className="rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-60"
          >
            Clock in with location
          </button>
        </div>
      )}
    </div>
  );
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10_000,
    });
  });
}

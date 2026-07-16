"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfilePictureUpload({
  employeeId,
  hasPicture,
}: {
  employeeId: number;
  hasPicture: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Cache-bust the <img> src after a successful upload — the URL itself
  // doesn't change (it's always /api/employees/[id]/profile-picture), so
  // without this the browser would keep showing the old cached image.
  const [version, setVersion] = useState(0);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/employees/me/profile-picture", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to upload picture.");
        setSubmitting(false);
        return;
      }
      setVersion((v) => v + 1);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-sky-100">
        {hasPicture || version > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element -- served
          // from our own API route, not a static/optimizable asset path.
          <img
            key={version}
            src={`/api/employees/${employeeId}/profile-picture?v=${version}`}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold text-sky-500">?</span>
        )}
      </div>
      <div>
        {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
        <label className="inline-block cursor-pointer rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50">
          {submitting ? "Uploading..." : "Change picture"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={submitting}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

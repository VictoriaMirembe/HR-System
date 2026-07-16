import crypto from "node:crypto";

// Generates an opaque, collision-resistant storage key namespaced by
// feature (e.g. "documents", "profile-pictures"), keeping the original
// file extension so a downloaded/served file still has a sensible
// name/type — but the user-supplied filename itself never becomes part of
// the actual path, sidestepping path-traversal or special-character
// handling concerns from untrusted input entirely.
export function generateStorageKey(namespace: string, originalFilename: string): string {
  const dotIndex = originalFilename.lastIndexOf(".");
  const rawExt = dotIndex >= 0 ? originalFilename.slice(dotIndex).toLowerCase() : "";
  const safeExt = /^\.[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : "";
  return `${namespace}/${crypto.randomUUID()}${safeExt}`;
}

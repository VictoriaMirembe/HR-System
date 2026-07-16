import { describe, expect, it } from "vitest";
import { generateDocumentStorageKey } from "./storage-key";

// Thin wrapper around generateStorageKey (see
// src/lib/storage/generate-key.test.ts for the general-case coverage) —
// this just checks it's namespaced correctly under "documents".
describe("generateDocumentStorageKey", () => {
  it("namespaces under documents/", () => {
    const key = generateDocumentStorageKey("policy.pdf");
    expect(key).toMatch(/^documents\/[0-9a-f-]{36}\.pdf$/);
  });
});

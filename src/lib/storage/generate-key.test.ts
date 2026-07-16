import { describe, expect, it } from "vitest";
import { generateStorageKey } from "./generate-key";

describe("generateStorageKey", () => {
  it("namespaces under the given prefix and keeps a lowercase extension", () => {
    const key = generateStorageKey("documents", "Employee Handbook.PDF");
    expect(key).toMatch(/^documents\/[0-9a-f-]{36}\.pdf$/);
  });

  it("drops an unsafe or overly long extension rather than trusting it", () => {
    const key = generateStorageKey("documents", "weird.???");
    expect(key).toMatch(/^documents\/[0-9a-f-]{36}$/);
  });

  it("handles a filename with no extension", () => {
    const key = generateStorageKey("profile-pictures", "README");
    expect(key).toMatch(/^profile-pictures\/[0-9a-f-]{36}$/);
  });

  it("never reuses a key for the same input filename", () => {
    const key1 = generateStorageKey("documents", "policy.pdf");
    const key2 = generateStorageKey("documents", "policy.pdf");
    expect(key1).not.toBe(key2);
  });

  it("ignores path-traversal attempts in the original filename", () => {
    const key = generateStorageKey("documents", "../../etc/passwd.pdf");
    expect(key).toMatch(/^documents\/[0-9a-f-]{36}\.pdf$/);
    expect(key).not.toContain("..");
    expect(key).not.toContain("/etc/");
  });
});

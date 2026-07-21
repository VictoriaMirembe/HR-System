import { describe, expect, it } from "vitest";
import { checkPasswordPolicy } from "./password-policy";

describe("checkPasswordPolicy", () => {
  it("accepts a strong, non-common password", () => {
    expect(checkPasswordPolicy("Zx9#mQ2wLp")).toEqual({ ok: true });
  });

  it("rejects passwords under 8 characters", () => {
    expect(checkPasswordPolicy("Az1!bc")).toEqual({
      ok: false,
      reason: "Password must be at least 8 characters.",
    });
  });

  it("rejects passwords missing a lowercase letter", () => {
    expect(checkPasswordPolicy("AZ123456!")).toMatchObject({ ok: false });
  });

  it("rejects passwords missing an uppercase letter", () => {
    expect(checkPasswordPolicy("az123456!")).toMatchObject({ ok: false });
  });

  it("rejects passwords missing a number", () => {
    expect(checkPasswordPolicy("Azazazaz!")).toMatchObject({ ok: false });
  });

  it("rejects passwords missing a symbol", () => {
    expect(checkPasswordPolicy("Azazaz123")).toMatchObject({ ok: false });
  });

  it("rejects common weak passwords even when they satisfy complexity rules", () => {
    // "ChangeMe123!" strips down to "changeme123", which is blocklisted —
    // this is exactly the seeded default password's shape, deliberately.
    expect(checkPasswordPolicy("ChangeMe123!")).toEqual({
      ok: false,
      reason: "This password is too common or predictable. Choose something less guessable.",
    });
  });

  it("rejects org-specific guesses", () => {
    expect(checkPasswordPolicy("MediaChallenge1!")).toMatchObject({ ok: false });
  });
});

// Shared password policy, checked wherever a user sets/changes a password
// (account setup, change password) — one set of rules, not duplicated
// per form. Pure/no I/O, so it's cheaply unit-testable.
//
// Not an exhaustive breach-list check (that'd mean either shipping a huge
// wordlist or calling an external API like Have I Been Pwned on every
// password change) — just a curated set of the most predictable passwords
// people actually reach for, plus complexity rules that catch most of the
// rest.

const COMMON_WEAK_PASSWORDS = new Set(
  [
    "password",
    "password1",
    "password123",
    "12345678",
    "123456789",
    "1234567890",
    "qwerty123",
    "qwertyuiop",
    "letmein123",
    "welcome123",
    "admin1234",
    "changeme",
    "changeme1",
    "changeme123",
    "iloveyou1",
    "monkey123",
    "dragon123",
    "football1",
    "baseball1",
    "master123",
    "sunshine1",
    "princess1",
    "trustno1a",
    "abc123456",
    "passw0rd1",
    "p@ssw0rd1",
    // Org-specific guesses — the kind of thing someone would try first
    // against this particular system.
    "mediachallenge",
    "mediachallenge1",
    "mci123456",
    "mci12345678",
    "hrsystem123",
  ].map((s) => s.toLowerCase())
);

export type PasswordPolicyResult = { ok: true } | { ok: false; reason: string };

export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < 8) {
    return { ok: false, reason: "Password must be at least 8 characters." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, reason: "Password must include at least one lowercase letter." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, reason: "Password must include at least one uppercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, reason: "Password must include at least one number." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, reason: "Password must include at least one symbol." };
  }

  // Catches both the raw password and a "stripped" version (punctuation
  // removed) so e.g. "Password123!" is still caught as a variant of
  // "password123" even though it technically passes the rules above.
  const lower = password.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9]/g, "");
  if (COMMON_WEAK_PASSWORDS.has(lower) || COMMON_WEAK_PASSWORDS.has(stripped)) {
    return {
      ok: false,
      reason: "This password is too common or predictable. Choose something less guessable.",
    };
  }

  return { ok: true };
}

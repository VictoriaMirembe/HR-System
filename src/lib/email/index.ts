import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
};

// Abstraction so a real provider (SES, Resend, SMTP) can be swapped in
// later without touching call sites — mirrors the storage interface
// pattern used for file uploads (see src/lib/storage once the Document
// Repository feature is built).
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

// Dev fallback: used whenever RESEND_API_KEY isn't set, so local
// development still works without needing real credentials. "Sending" an
// email just logs it to the server console where you can see the setup
// link and click it manually.
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `\n[email:dev] To: ${message.to}\n[email:dev] Subject: ${message.subject}\n[email:dev] ${message.body}\n`
    );
  }
}

class ResendEmailProvider implements EmailProvider {
  private client: Resend;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
    });
    // Thrown rather than swallowed so the failure is never silently lost —
    // callers use sendEmailSafely() below, which logs it.
    if (error) {
      throw new Error(`Failed to send email via Resend: ${error.message}`);
    }
  }
}

const resendApiKey = process.env.RESEND_API_KEY;

// EMAIL_FROM must be an address on a domain verified in the Resend
// dashboard (see README) — Resend rejects sends from unverified domains.
export const emailProvider: EmailProvider = resendApiKey
  ? new ResendEmailProvider(
      resendApiKey,
      process.env.EMAIL_FROM ?? "MCI HR System <onboarding@resend.dev>"
    )
  : new ConsoleEmailProvider();

// Every call site in this app treats email as a best-effort notification
// on top of a mutation that already succeeded and was already audit-logged
// (an employee was created, a leave request was approved, etc.) — a broken
// email provider (bad API key, unverified domain, transient outage)
// shouldn't turn that into a 500 for the person who took the action. Use
// this instead of calling emailProvider.send() directly; failures are
// logged, not thrown.
export async function sendEmailSafely(message: EmailMessage): Promise<void> {
  try {
    await emailProvider.send(message);
  } catch (error) {
    console.error(`[email] Failed to send "${message.subject}" to ${message.to}:`, error);
  }
}

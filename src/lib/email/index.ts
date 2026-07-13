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

// Dev-only implementation: no SMTP credentials exist yet, so "sending" an
// email just logs it to the server console where you can see the setup
// link and click it manually during development.
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `\n[email:dev] To: ${message.to}\n[email:dev] Subject: ${message.subject}\n[email:dev] ${message.body}\n`
    );
  }
}

export const emailProvider: EmailProvider = new ConsoleEmailProvider();

import nodemailer from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Returns a real nodemailer transport when Mailtrap or generic SMTP credentials are configured,
 * otherwise null (dev fallback: log the email content instead of sending).
 */
function createTransport(): nodemailer.Transporter | null {
  if (env.MAILTRAP_PASS) {
    return nodemailer.createTransport({
      host: env.MAILTRAP_HOST,
      port: env.MAILTRAP_PORT ?? 587,
      secure: (env.MAILTRAP_PORT ?? 587) === 465,
      auth: {
        user: env.MAILTRAP_USER,
        pass: env.MAILTRAP_PASS,
      },
    });
  }

  if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT ?? 587,
      secure: (env.EMAIL_PORT ?? 587) === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });
  }

  return null;
}

const transporter = createTransport();
const BOOKING_INQUIRY_RECIPIENT = "info@dailyassistuk.com";

// ─── Email Senders ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const subject = "DailyAssist — Password Reset Request";
  const html = `
    <p>Hello,</p>
    <p>You requested a password reset for your DailyAssist account.</p>
    <p>Click the link below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <p><a href="${resetUrl}" style="font-size:16px">${resetUrl}</a></p>
    <p>If you did not request this, you can safely ignore this email. Your password will not change.</p>
    <br/>
    <p>— The DailyAssist Team</p>
  `;

  if (!transporter) {
    logger.info(
      { to, resetUrl },
      "[DEV] Password reset email not sent — Mailtrap/SMTP config not set. Use the resetUrl above to test.",
    );
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  logger.info({ to }, "Password reset email sent");
}


export type StaffCredentialsEmailInput = {
  to: string;
  email: string;
  password: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function professionalShell(title: string, preview: string, body: string): string {
  return `
  <!doctype html>
  <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.10);">
            <tr><td style="background:linear-gradient(135deg,#0f766e,#14b8a6);padding:28px 32px;color:#ffffff;">
              <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;opacity:.9;">DailyAssist</div>
              <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;font-weight:800;">${escapeHtml(title)}</h1>
            </td></tr>
            <tr><td style="padding:32px;">${body}</td></tr>
            <tr><td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#64748b;font-size:13px;line-height:1.6;">
              <strong style="color:#334155;">DailyAssist UK</strong><br/>
              Professional home-help, companionship, and community support services.<br/>
              If you were not expecting this email, please contact your DailyAssist administrator.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

export async function sendStaffCredentialsEmail(input: StaffCredentialsEmailInput): Promise<void> {
  const subject = "DailyAssist Staff Dashboard Access";
  const html = professionalShell(
    "Your Staff Dashboard Access",
    "Your DailyAssist business login details are ready.",
    `
      <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Hello,</p>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.7;">Your DailyAssist staff dashboard access has been set up. Use the business email below with the temporary password to sign in to your dashboard.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 12px;margin:22px 0;">
        <tr><td style="padding:16px 18px;background:#ecfeff;border:1px solid #99f6e4;border-radius:12px;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#0f766e;font-weight:700;">Business login email</div><div style="margin-top:6px;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(input.email)}</div></td></tr>
        <tr><td style="padding:16px 18px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#c2410c;font-weight:700;">Temporary password</div><div style="margin-top:6px;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(input.password)}</div></td></tr>
      </table>
      <p style="margin:22px 0 0;font-size:15px;line-height:1.7;color:#475569;">For security, keep these details private and store them safely. Your personal/primary email remains unchanged; the business email is only for staff dashboard access.</p>
      <p style="margin:24px 0 0;font-size:15px;line-height:1.7;color:#475569;">Kind regards,<br/><strong>The DailyAssist Team</strong></p>
    `
  );
  const text = `Your DailyAssist staff dashboard access is ready. Business login email: ${input.email}. Temporary password: ${input.password}. Your primary email remains unchanged.`;

  if (!transporter) {
    logger.info(
      { to: input.to, email: input.email, password: input.password, mailer: 'smtp' },
      "[DEV] Staff credentials email not sent — Mailtrap/SMTP config not set.",
    );
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });

  logger.info({ to: input.to, mailer: 'smtp' }, "Staff credentials email sent");
}

export type BookingInquiryEmailInput = {
  fullName: string;
  email: string;
  phoneNumber: string;
  subject: string;
  message: string;
};

function buildBookingInquiryHtml(input: BookingInquiryEmailInput): string {
  return `
    <p>A new booking enquiry was submitted via the public website.</p>
    <p><strong>Full name:</strong> ${input.fullName}</p>
    <p><strong>Email:</strong> ${input.email}</p>
    <p><strong>Phone number:</strong> ${input.phoneNumber}</p>
    <p><strong>Subject:</strong> ${input.subject}</p>
    <p><strong>Message:</strong></p>
    <p>${input.message.replace(/\n/g, "<br/>")}</p>
  `;
}

export async function sendBookingInquiryEmail(
  input: BookingInquiryEmailInput,
): Promise<void> {
  const emailSubject = `DailyAssist booking enquiry — ${input.subject}`;
  const html = buildBookingInquiryHtml(input);

  if (!transporter) {
    logger.info(
      { recipient: BOOKING_INQUIRY_RECIPIENT, ...input },
      "[DEV] Booking enquiry email not sent — Mailtrap/SMTP config not set.",
    );
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: BOOKING_INQUIRY_RECIPIENT,
    replyTo: input.email,
    subject: emailSubject,
    html,
  });

  logger.info(
    { recipient: BOOKING_INQUIRY_RECIPIENT, replyTo: input.email },
    "Booking enquiry email sent",
  );
}

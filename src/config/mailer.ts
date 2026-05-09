import nodemailer from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Returns a real nodemailer transport when Mailtrap or generic SMTP credentials are configured,
 * otherwise null (dev fallback: log the email content instead of sending).
 */
function createTransport(): nodemailer.Transporter | null {
  if (env.MAILTRAP_HOST && env.MAILTRAP_USER && env.MAILTRAP_PASS) {
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

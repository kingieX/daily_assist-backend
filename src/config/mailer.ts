import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from './logger';

/**
 * Returns a real nodemailer transport when EMAIL_HOST + credentials are configured,
 * otherwise null (dev fallback: log the email content instead of sending).
 */
function createTransport(): nodemailer.Transporter | null {
  if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT ?? 587,
      secure: (env.EMAIL_PORT ?? 587) === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS
      }
    });
  }
  return null;
}

const transporter = createTransport();

// ─── Email Senders ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const subject = 'DailyAssist — Password Reset Request';
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
    // Dev fallback: print the reset URL so it can be tested without an email server
    logger.info(
      { to, resetUrl },
      '[DEV] Password reset email not sent — EMAIL_HOST/USER/PASS not configured. Use the resetUrl above to test.'
    );
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html
  });

  logger.info({ to }, 'Password reset email sent');
}

import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().default(4000),
    CORS_ORIGIN: z.string().default("*"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
    // Email config — optional in dev (reset links are logged to console when not set)
    MAILTRAP_HOST: z.string().default("live.smtp.mailtrap.io"),
    MAILTRAP_PORT: z.coerce.number().default(587),
    MAILTRAP_USER: z.string().default("api"),
    MAILTRAP_PASS: z.string().optional(),
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.coerce.number().optional(),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default("no-reply@dailyassistuk.com"),
    EMAIL_DELIVERY_REQUIRED: z.coerce
      .boolean()
      .default(process.env.NODE_ENV === "production"),
    CAPTCHA_SECRET: z.string().optional(),
    CAPTCHA_VERIFY_URL: z
      .string()
      .url()
      .default("https://challenges.cloudflare.com/turnstile/v0/siteverify"),
    FRONTEND_URL: z.string().default("http://localhost:3000"),
    REDIS_URL: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    const hasMailtrapSmtp = Boolean(value.MAILTRAP_PASS);
    const smtpFields = [value.EMAIL_HOST, value.EMAIL_USER, value.EMAIL_PASS];
    const hasGenericSmtp = smtpFields.every(Boolean);
    const hasPartialGenericSmtp = smtpFields.some(Boolean) && !hasGenericSmtp;

    if (hasPartialGenericSmtp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_HOST"],
        message:
          "EMAIL_HOST, EMAIL_USER, and EMAIL_PASS must be provided together for generic SMTP delivery",
      });
    }

    if (value.EMAIL_DELIVERY_REQUIRED && !hasMailtrapSmtp && !hasGenericSmtp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_DELIVERY_REQUIRED"],
        message:
          "SMTP email delivery is required; set MAILTRAP_PASS or set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS",
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formatted = parsedEnv.error.issues.map((issue) => ({
    key: issue.path.join("."),
    message: issue.message,
  }));
  throw new Error(
    `Invalid environment configuration: ${JSON.stringify(formatted)}`,
  );
}

export const env = parsedEnv.data;

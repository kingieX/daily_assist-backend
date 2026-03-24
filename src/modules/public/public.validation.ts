import { z } from 'zod';

export const createBookingSchema = z.object({
  // ── Client info ──────────────────────────────────────────────────────────────
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z
    .string()
    .trim()
    .email('Invalid email format')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: z.string().trim().min(7, 'Phone number is required'),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  zipcode: z.string().trim().optional(),

  // ── Booking details ───────────────────────────────────────────────────────────
  packageId: z.string().uuid('Invalid package ID').optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  startDate: z.string().optional(),
  specialMessage: z.string().trim().max(1000).optional(),

  // ── Emergency contact ─────────────────────────────────────────────────────────
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  emergencyContactRelationship: z.string().trim().optional(),

  // ── Services ──────────────────────────────────────────────────────────────────
  selectedServiceIds: z.array(z.string().uuid()).optional().default([]),
  additionalServiceIds: z.array(z.string().uuid()).optional().default([]),

  // ── Consent (both must be true) ───────────────────────────────────────────────
  agreeToTerms: z.literal(true, {
    error: 'You must agree to the terms and conditions'
  }),
  consentToDailyassist: z.literal(true, {
    error: 'Consent to DailyAssist data use is required'
  })
});

export const workerApplicationSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Invalid email format'),
  phone: z.string().trim().min(7, 'Phone number is required'),
  // URL to CV — link to Google Drive, Dropbox, etc. (file upload via S3 comes in Phase 7)
  cvFileUrl: z.string().url('Must be a valid URL').optional()
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type WorkerApplicationInput = z.infer<typeof workerApplicationSchema>;

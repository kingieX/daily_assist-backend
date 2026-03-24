import { z } from 'zod';
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional()
);

const optionalIsoDateString = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z
    .string()
    .regex(isoDateRegex, 'Date must be in YYYY-MM-DD format')
    .refine((value) => isValidIsoDate(value), 'Date must be a valid calendar date')
    .optional()
);

const optionalSpecialMessage = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().max(1000, 'Special message must be at most 1000 characters').optional()
);

export const createBookingSchema = z.object({
  // ── Client info ──────────────────────────────────────────────────────────────
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().email('Invalid email format').optional()
  ),
  phone: z.string().trim().min(7, 'Phone number is required'),
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  zipcode: optionalTrimmedString,

  // ── Booking details ───────────────────────────────────────────────────────────
  packageId: z.string().uuid('Invalid package ID').optional(),
  preferredDate: optionalIsoDateString,
  preferredTime: optionalTrimmedString,
  startDate: optionalIsoDateString,
  specialMessage: optionalSpecialMessage,

  // ── Emergency contact ─────────────────────────────────────────────────────────
  emergencyContactName: optionalTrimmedString,
  emergencyContactPhone: optionalTrimmedString,
  emergencyContactRelationship: optionalTrimmedString,

  // ── Services ──────────────────────────────────────────────────────────────────
  selectedServiceIds: z.array(z.string().uuid('Invalid selected service ID')).default([]),
  additionalServiceIds: z.array(z.string().uuid('Invalid additional service ID')).default([]),

  // ── Consent (both must be true) ───────────────────────────────────────────────
  agreeToTerms: z.literal(true, {
    error: 'You must agree to the terms and conditions'
  }),
  consentToDailyassist: z.literal(true, {
    error: 'Consent to DailyAssist data use is required'
  })
}).superRefine((data, context) => {
  const overlap = data.selectedServiceIds.filter((serviceId) =>
    data.additionalServiceIds.includes(serviceId)
  );

  if (overlap.length > 0) {
    context.addIssue({
      code: 'custom',
      message: `A service cannot be both selected and additional: ${overlap.join(', ')}`,
      path: ['additionalServiceIds']
    });
  }
});

export const workerApplicationSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Invalid email format'),
  phone: z.string().trim().min(7, 'Phone number is required')
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type WorkerApplicationInput = z.infer<typeof workerApplicationSchema>;

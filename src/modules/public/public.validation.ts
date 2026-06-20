import { z } from "zod";

const dayMap: Record<string, string> = {
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
  SUNDAY: "SUNDAY"
};

const daySchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return dayMap[value.trim().replace(/\s+/g, "_").toUpperCase()];
}, z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]));

const optionalText = (max: number) => z.string().trim().max(max).optional();
const stringArray = z.array(z.string().trim().min(1)).default([]);

export const createConsultationSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email format"),
  phoneNumber: z.string().trim().min(7, "Phone number is required"),
  subject: z.string().trim().min(1, "Subject is required").max(150, "Subject is too long"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long")
});

export const createPublicBookingSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Invalid email format"),
    phoneNumber: z.string().trim().min(7, "Phone number is required").optional(),
    phone: z.string().trim().min(7, "Phone number is required").optional(),
    address: z.string().trim().min(1, "Address is required").max(255),
    city: z.string().trim().min(1, "City is required").max(100),
    zipcode: z.string().trim().min(1, "Postcode is required").max(20).optional(),
    postcode: z.string().trim().min(1, "Postcode is required").max(20).optional(),
    packageId: z.string().uuid("Invalid package ID").optional(),
    packageSlug: optionalText(120),
    packageName: optionalText(120),
    preferredDays: z.array(daySchema).min(1, "Select at least one preferred day"),
    preferredTime: z.string().trim().min(1, "Preferred time is required").max(50),
    startDate: z.coerce.date(),
    specialMessage: optionalText(2000),
    selectedServiceIds: z.array(z.string().uuid()).default([]),
    additionalServiceIds: z.array(z.string().uuid()).default([]),
    selectedServices: stringArray,
    additionalServices: stringArray,
    emergencyContactName: optionalText(100),
    emergencyContactPhone: optionalText(30),
    emergencyContactRelationship: optionalText(100),
    agreeToTerms: z.literal(true),
    consentToDailyassist: z.literal(true).optional(),
    consentToDataProcessing: z.literal(true).optional()
  })
  .refine((data) => data.phoneNumber || data.phone, {
    path: ["phoneNumber"],
    message: "Phone number is required"
  })
  .refine((data) => data.zipcode || data.postcode, {
    path: ["postcode"],
    message: "Postcode is required"
  })
  .refine((data) => data.consentToDailyassist === true || data.consentToDataProcessing === true, {
    path: ["consentToDailyassist"],
    message: "Consent to data processing is required"
  })
  .transform((data) => ({
    ...data,
    phoneNumber: data.phoneNumber ?? data.phone ?? "",
    zipcode: data.zipcode ?? data.postcode ?? "",
    consentToDailyassist: true
  }));

export const workerApplicationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email format"),
  phone: z.string().trim().min(7, "Phone number is required")
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type CreatePublicBookingInput = z.infer<typeof createPublicBookingSchema>;
export type WorkerApplicationInput = z.infer<typeof workerApplicationSchema>;

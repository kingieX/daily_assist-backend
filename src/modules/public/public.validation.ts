import { z } from "zod";

export const createConsultationSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email format"),
  phoneNumber: z.string().trim().min(7, "Phone number is required"),
  subject: z.string().trim().min(1, "Subject is required").max(150, "Subject is too long"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long")
});

export const createPublicBookingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email format"),
  phoneNumber: z.string().trim().min(7, "Phone number is required"),
  address: z.string().trim().min(1, "Address is required").max(255),
  city: z.string().trim().min(1, "City is required").max(100),
  zipcode: z.string().trim().min(1, "Zipcode is required").max(20),
  packageId: z.string().uuid("Invalid package ID"),
  preferredDays: z.array(z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])).min(1),
  preferredTime: z.string().trim().min(1).max(50),
  startDate: z.coerce.date(),
  specialMessage: z.string().trim().max(2000).optional(),
  selectedServiceIds: z.array(z.string().uuid()).default([]),
  additionalServiceIds: z.array(z.string().uuid()).default([]),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
  emergencyContactRelationship: z.string().trim().max(100).optional(),
  agreeToTerms: z.literal(true),
  consentToDailyassist: z.literal(true)
});

export const workerApplicationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email format"),
  phone: z.string().trim().min(7, "Phone number is required")
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type CreatePublicBookingInput = z.infer<typeof createPublicBookingSchema>;
export type WorkerApplicationInput = z.infer<typeof workerApplicationSchema>;

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
const serviceTypeValues = ['Home-Help (cleaning, tidying, laundry)', 'Errands & Shopping Support', 'Welfare Check-Ins & Companionship', 'Appointment Escort/Transport', 'Light Gardening & Practical Tasks', 'Community Access Support', 'Light Meal Preparation'] as const;
const additionalServiceValues = ['One-off Deep Clean', 'End of Tenancy Cleaning', 'Building Construction Cleaning'] as const;
const preferredDayValues = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const preferredTimeValues = ['8:00 Am', '9:00 Am', '10:00 Am', '11:00 Am', '12:00 Pm', '1:00 Pm', '2:00 Pm', '3:00 Pm', '4:00 Pm', '5:00 Pm', '6:00 Pm'] as const;
const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};
const truthyBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
  return value;
}, z.literal(true).default(true));
const stringArray = z.preprocess(asArray, z.array(z.string().trim().min(1)).default([]));
const uuidArray = z.preprocess(asArray, z.array(z.string().trim().min(1)).default([]));

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
    city: z.string().trim().max(100).default(""),
    zipcode: z.string().trim().min(1, "Postcode is required").max(20).optional(),
    postcode: z.string().trim().min(1, "Postcode is required").max(20).optional(),
    packageId: z.string().uuid("Invalid package ID").optional(),
    packageSlug: optionalText(120),
    packageName: optionalText(120),
    serviceName: optionalText(120),
    servicePrice: optionalText(80),
    serviceFrequency: optionalText(80),
    visitsPerWeek: optionalText(80),
    transportMileage: optionalText(80),
    preferredDays: z.preprocess(asArray, z.array(z.union([daySchema, z.enum(preferredDayValues)])).min(1, "Select at least one preferred day")),
    preferredTime: z.union([z.enum(preferredTimeValues), z.string().trim().min(1).max(50)]),
    startDate: z.coerce.date().optional(),
    preferredStartDate: z.coerce.date().optional(),
    specialMessage: optionalText(2000),
    selectedServiceIds: uuidArray,
    additionalServiceIds: uuidArray,
    selectedServices: stringArray,
    additionalServices: stringArray,
    selectedServiceTypes: stringArray.optional(),
    selectedAdditional: stringArray.optional(),
    emergencyContactName: optionalText(100),
    emergencyContactPhone: optionalText(30),
    emergencyContactRelationship: optionalText(100),
    agreeToTerms: truthyBoolean,
    consentToDailyassist: truthyBoolean.optional(),
    consentToDataProcessing: truthyBoolean.optional()
  })
  .refine((data) => data.phoneNumber || data.phone, {
    path: ["phoneNumber"],
    message: "Phone number is required"
  })


  .transform((data) => ({
    ...data,
    phoneNumber: data.phoneNumber ?? data.phone ?? "",
    zipcode: data.zipcode ?? data.postcode ?? "",
    startDate: data.startDate ?? data.preferredStartDate ?? new Date(),
    selectedServiceIds: (data.selectedServiceIds ?? []).filter((value) => z.string().uuid().safeParse(value).success),
    additionalServiceIds: (data.additionalServiceIds ?? []).filter((value) => z.string().uuid().safeParse(value).success),
    selectedServices: [...(data.selectedServiceTypes ?? data.selectedServices), ...(data.selectedServiceIds ?? []).filter((value) => !z.string().uuid().safeParse(value).success)],
    additionalServices: [...(data.selectedAdditional ?? data.additionalServices), ...(data.additionalServiceIds ?? []).filter((value) => !z.string().uuid().safeParse(value).success)],
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

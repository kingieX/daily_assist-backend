import {
  ApplicationStatus,
  BookingStatus,
  ClientStatus,
  UserStatus
} from '@prisma/client';
import { z } from 'zod';

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional()
);

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().email('Invalid email format').optional()
);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const sexSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);
const staffRoleLabelSchema = z.enum(['HOME_HELP_SUPPORT_ASSISTANT', 'ADMIN']);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID')
});

const bookingSortBySchema = z.enum(['createdAt', 'preferredDate', 'updatedAt']).default('createdAt');
const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const bookingListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(BookingStatus).optional(),
  clientId: z.string().uuid('Invalid client ID').optional(),
  assignedStaffId: z.string().uuid('Invalid staff ID').optional(),
  sortBy: bookingSortBySchema,
  sortOrder: sortOrderSchema
});

export const assignBookingSchema = z.object({
  staffId: z.string().uuid('Invalid staff ID')
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason is required').max(500)
});

export const completeBookingSchema = z.object({
  completionNotes: z.string().trim().max(1000).optional()
});

export const updateBookingSchema = z
  .object({
    preferredDate: z.coerce.date().optional(),
    preferredTime: optionalTrimmedString,
    startDate: z.coerce.date().optional(),
    specialMessage: z.string().trim().max(1000).optional(),
    emergencyContactName: optionalTrimmedString,
    emergencyContactPhone: optionalTrimmedString,
    emergencyContactRelationship: optionalTrimmedString
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  });

const clientSortBySchema = z.enum(['createdAt', 'updatedAt', 'firstName']).default('createdAt');

export const clientListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(ClientStatus).optional(),
  sortBy: clientSortBySchema,
  sortOrder: sortOrderSchema
});

export const createClientSchema = z.object({
  title: optionalTrimmedString,
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: optionalEmail,
  phone: z.string().trim().min(7, 'Phone number is required'),
  age: z.coerce.number().int().min(0).max(130).optional(),
  sex: sexSchema.optional(),
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  zipcode: optionalTrimmedString,
  emergencyContactName: optionalTrimmedString,
  emergencyContactPhone: optionalTrimmedString,
  emergencyContactRelationship: optionalTrimmedString,
  proofOfAddressUrl: z.string().url('Proof of address URL must be valid').optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.nativeEnum(ClientStatus).optional()
});

export const updateClientSchema = createClientSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  });

const staffSortBySchema = z.enum(['createdAt', 'updatedAt', 'lastLoginAt', 'email', 'staffCode']).default('createdAt');

export const staffListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(UserStatus).optional(),
  sortBy: staffSortBySchema,
  sortOrder: sortOrderSchema
});

export const createStaffSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().min(7, 'Phone number is required'),
  dateOfBirth: z.coerce.date().optional(),
  sex: sexSchema.optional(),
  zone: optionalTrimmedString,
  ownsCar: z.coerce.boolean().optional(),
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  zipcode: optionalTrimmedString,
  emergencyContactName: optionalTrimmedString,
  emergencyContactPhone: optionalTrimmedString,
  emergencyContactRelationship: optionalTrimmedString,
  photoUrl: z.string().url('Photo URL must be valid').optional(),
  cvFileUrl: z.string().url('CV URL must be valid').optional(),
  staffRoleLabel: staffRoleLabelSchema.optional(),
  summary: z.string().trim().max(2000).optional(),
  skills: z.string().trim().max(2000).optional(),
  status: z.nativeEnum(UserStatus).optional()
});

export const resetStaffPasswordSchema = z.object({
  newPassword: passwordSchema
});

export const updateStaffSchema = z
  .object({
    email: optionalEmail,
    status: z.nativeEnum(UserStatus).optional(),
    firstName: optionalTrimmedString,
    lastName: optionalTrimmedString,
    phone: optionalTrimmedString,
    dateOfBirth: z.coerce.date().optional(),
    sex: sexSchema.optional(),
    zone: optionalTrimmedString,
    ownsCar: z.coerce.boolean().optional(),
    address: optionalTrimmedString,
    city: optionalTrimmedString,
    zipcode: optionalTrimmedString,
    emergencyContactName: optionalTrimmedString,
    emergencyContactPhone: optionalTrimmedString,
    emergencyContactRelationship: optionalTrimmedString,
    photoUrl: z.string().url('Photo URL must be valid').optional(),
    cvFileUrl: z.string().url('CV URL must be valid').optional(),
    staffRoleLabel: staffRoleLabelSchema.optional(),
    summary: z.string().trim().max(2000).optional(),
    skills: z.string().trim().max(2000).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  });

export const recruitmentListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(ApplicationStatus).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt'),
  sortOrder: sortOrderSchema
});

export const updateRecruitmentStatusSchema = z.object({
  status: z
    .nativeEnum(ApplicationStatus)
    .refine((status) => status !== ApplicationStatus.CONVERTED_TO_STAFF, {
      message: 'Use convert-to-staff endpoint to mark converted applicants'
    }),
  reviewNotes: z.string().trim().max(2000).optional()
});

export const convertApplicationSchema = z.object({
  password: passwordSchema
});

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
export type AssignBookingInput = z.infer<typeof assignBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type CompleteBookingInput = z.infer<typeof completeBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type StaffListQuery = z.infer<typeof staffListQuerySchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type RecruitmentListQuery = z.infer<typeof recruitmentListQuerySchema>;
export type UpdateRecruitmentStatusInput = z.infer<typeof updateRecruitmentStatusSchema>;
export type ConvertApplicationInput = z.infer<typeof convertApplicationSchema>;

import { z } from 'zod';
import { emptyStringToUndefined, optionalQueryUuid, queryLimit, queryPage } from '../../utils/query-validation';
import { VISIT_STATUS } from './visit-state';

const titleSchema = z.enum(['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.']);
const timeSchema = z.enum(['8:00 Am', '9:00 Am', '10:00 Am', '11:00 Am', '12:00 Pm', '1:00 Pm', '2:00 Pm', '3:00 Pm', '4:00 Pm', '5:00 Pm', '6:00 Pm', '7:00 Pm']);
const packageSchema = z.enum(['Basic Package', 'Standard Package', 'Premium Package']);
const serviceTypeSchema = z.enum(['Home-Help (cleaning, tidying, laundry)', 'Errands & Shopping Support', 'Welfare Check-Ins & Companionship', 'Appointment Escort/Transport', 'Light Gardening & Practical Tasks', 'Community Access Support', 'Light Meal Preparation']);
const additionalServiceSchema = z.enum(['One-off Deep Clean', 'End of Tenancy Cleaning', 'Building Construction Cleaning']);

const frontendVisitFields = {
  clientTitle: titleSchema.optional(),
  clientName: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be an ISO date').optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  staffId: z.string().uuid('Invalid staff ID').optional(),
  package: packageSchema.optional(),
  selectedServiceTypes: z.array(serviceTypeSchema).optional(),
  selectedAdditional: z.array(additionalServiceSchema).optional(),
  note: z.string().trim().max(2000).optional()
};


export const visitIdParamSchema = z.object({
  id: z.string().uuid('Invalid visit ID')
});

const paginationSchema = z.object({
  page: queryPage(),
  limit: queryLimit()
});

const sortOrderSchema = z.preprocess(emptyStringToUndefined, z.enum(['asc', 'desc']).default('desc'));
const visitStatusSchema = z.enum([
  VISIT_STATUS.ASSIGNED,
  VISIT_STATUS.ACKNOWLEDGED,
  VISIT_STATUS.IN_PROGRESS,
  VISIT_STATUS.COMPLETED,
  VISIT_STATUS.CANCELLED,
  VISIT_STATUS.NO_SHOW
]);

export const adminVisitListQuerySchema = paginationSchema.extend({
  status: z.preprocess(emptyStringToUndefined, visitStatusSchema.optional()),
  staffId: optionalQueryUuid('Invalid staff ID'),
  bookingId: optionalQueryUuid('Invalid booking ID'),
  sortBy: z.preprocess(
    emptyStringToUndefined,
    z.enum(['scheduledStartAt', 'createdAt', 'updatedAt']).default('scheduledStartAt')
  ),
  sortOrder: sortOrderSchema
});

export const createVisitSchema = z
  .object({
    bookingId: z.string().uuid('Invalid booking ID').optional(),
    scheduledStartAt: z.coerce.date().optional(),
    scheduledEndAt: z.coerce.date().optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    ...frontendVisitFields,
    clientName: frontendVisitFields.clientName.unwrap(),
    address: frontendVisitFields.address.unwrap(),
    date: frontendVisitFields.date.unwrap(),
    startTime: frontendVisitFields.startTime.unwrap(),
    endTime: frontendVisitFields.endTime.unwrap(),
    staffId: frontendVisitFields.staffId.unwrap(),
    package: frontendVisitFields.package.unwrap()
  })
  .refine((data) => Boolean(data.bookingId) || Boolean(data.clientName), {
    message: 'clientName is required when bookingId is not provided',
    path: ['clientName']
  });

export const updateVisitSchema = z
  .object({
    scheduledStartAt: z.coerce.date().optional(),
    scheduledEndAt: z.coerce.date().optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    staffNotes: z.string().trim().max(2000).optional(),
    ...frontendVisitFields
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const reassignVisitSchema = z.object({
  ...frontendVisitFields,
  clientName: frontendVisitFields.clientName.unwrap(),
  address: frontendVisitFields.address.unwrap(),
  date: frontendVisitFields.date.unwrap(),
  startTime: frontendVisitFields.startTime.unwrap(),
  endTime: frontendVisitFields.endTime.unwrap(),
  staffId: frontendVisitFields.staffId.unwrap(),
  package: frontendVisitFields.package.unwrap()
});

export const cancelVisitSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional()
});

export const staffIdParamSchema = z.object({ staffId: z.string().uuid('Invalid staff ID') });
export const staffTaskParamSchema = z.object({ staffId: z.string().uuid('Invalid staff ID'), taskId: z.string().uuid('Invalid task ID') });

export const checkOutVisitSchema = z.object({
  completionSummary: z.string().trim().max(2000).optional(),
  staffNotes: z.string().trim().max(2000).optional()
});

export type AdminVisitListQuery = z.infer<typeof adminVisitListQuerySchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type ReassignVisitInput = z.infer<typeof reassignVisitSchema>;
export type CancelVisitInput = z.infer<typeof cancelVisitSchema>;
export type CheckOutVisitInput = z.infer<typeof checkOutVisitSchema>;

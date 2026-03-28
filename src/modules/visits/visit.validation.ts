import { z } from 'zod';
import { VISIT_STATUS } from './visit-state';

export const visitIdParamSchema = z.object({
  id: z.string().uuid('Invalid visit ID')
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');
const visitStatusSchema = z.enum([
  VISIT_STATUS.ASSIGNED,
  VISIT_STATUS.ACKNOWLEDGED,
  VISIT_STATUS.IN_PROGRESS,
  VISIT_STATUS.COMPLETED,
  VISIT_STATUS.CANCELLED,
  VISIT_STATUS.NO_SHOW
]);

export const adminVisitListQuerySchema = paginationSchema.extend({
  status: visitStatusSchema.optional(),
  staffId: z.string().uuid('Invalid staff ID').optional(),
  bookingId: z.string().uuid('Invalid booking ID').optional(),
  sortBy: z.enum(['scheduledStartAt', 'createdAt', 'updatedAt']).default('scheduledStartAt'),
  sortOrder: sortOrderSchema
});

export const createVisitSchema = z
  .object({
    bookingId: z.string().uuid('Invalid booking ID'),
    staffId: z.string().uuid('Invalid staff ID'),
    scheduledStartAt: z.coerce.date(),
    scheduledEndAt: z.coerce.date(),
    adminNotes: z.string().trim().max(2000).optional()
  })
  .refine((data) => data.scheduledEndAt > data.scheduledStartAt, {
    message: 'scheduledEndAt must be after scheduledStartAt',
    path: ['scheduledEndAt']
  });

export const updateVisitSchema = z
  .object({
    scheduledStartAt: z.coerce.date().optional(),
    scheduledEndAt: z.coerce.date().optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    staffNotes: z.string().trim().max(2000).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  })
  .refine(
    (data) =>
      !data.scheduledStartAt || !data.scheduledEndAt || data.scheduledEndAt > data.scheduledStartAt,
    {
      message: 'scheduledEndAt must be after scheduledStartAt',
      path: ['scheduledEndAt']
    }
  );

export const reassignVisitSchema = z.object({
  staffId: z.string().uuid('Invalid staff ID')
});

export const cancelVisitSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

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

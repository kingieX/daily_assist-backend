import { z } from 'zod';
import { emptyStringToUndefined, queryPage } from '../../utils/query-validation';

const optionalTrimmedString = z.preprocess((v) => typeof v === 'string' && v.trim() === '' ? undefined : v, z.string().trim().optional());

export const updateAdminProfileSchema = z.object({
  firstName: optionalTrimmedString,
  lastName: optionalTrimmedString,
  photo: optionalTrimmedString,
  email: z.never({ error: 'email cannot be changed from this endpoint' }).optional(),
  role: z.never({ error: 'role cannot be changed from this endpoint' }).optional()
});

export const deleteAdminAccountSchema = z.object({ confirm: z.literal(true, { error: 'confirm must be true' }) });

export const notificationSettingsSchema = z.object({
  bookingRequest: z.boolean().optional(),
  staffCheckin: z.boolean().optional(),
  staffCheckout: z.boolean().optional(),
  missedCheckin: z.boolean().optional(),
  missedCheckout: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one notification setting must be provided' });

export const systemLogQuerySchema = z.object({
  user: z.preprocess(emptyStringToUndefined, z.enum(['Admin', 'Operation Manager', 'Staff', 'System']).optional()),
  action: z.preprocess(emptyStringToUndefined, z.enum(['Created', 'Updated', 'Deleted', 'Assigned', 'Approved', 'Triggered', 'Submitted', 'Attempted', 'Sent', 'Cancelled']).optional()),
  module: z.preprocess(emptyStringToUndefined, z.enum(['Clients', 'Staff', 'Visits', 'Bookings', 'Messages', 'Settings', 'Alerts', 'Notification', 'Check-in', 'Visit logs', 'Service']).optional()),
  dateRange: z.preprocess(emptyStringToUndefined, z.enum(['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range']).optional()),
  startDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
  endDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
  search: optionalTrimmedString,
  page: queryPage().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export const systemLogExportQuerySchema = systemLogQuerySchema.omit({ page: true, pageSize: true }).extend({ format: z.enum(['csv', 'pdf']) });

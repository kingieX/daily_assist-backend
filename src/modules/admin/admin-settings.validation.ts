import { z } from 'zod';
import { emptyStringToUndefined, queryPage } from '../../utils/query-validation';

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional()
);

export const updateAdminProfileSchema = z
  .object({
    firstName: optionalTrimmedString,
    lastName: optionalTrimmedString,
    photo: optionalTrimmedString,
    email: z.never({ error: 'email cannot be changed from this endpoint' }).optional(),
    role: z.never({ error: 'role cannot be changed from this endpoint' }).optional()
  })
  .strict();

export const deleteAdminAccountSchema = z.object({
  confirm: z.literal(true, { error: 'confirm must be true' })
});

const superAdminNotificationToggleSchema = z.object({ email: z.boolean().optional(), dashboard: z.boolean().optional() }).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().trim().min(1, 'All fields are required.'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string().min(1, 'All fields are required.')
}).refine((data) => data.newPassword === data.confirmPassword, { message: 'New passwords do not match.', path: ['confirmPassword'] });

export const rolesPermissionsUpdateSchema = z.object({
  admin: z.record(z.string(), z.boolean()).optional(),
  staff: z.record(z.string(), z.boolean()).optional()
}).strict().refine((data) => Object.keys(data).length > 0, { message: 'At least one role permission update must be provided' });

export const notificationSettingsSchema = z
  .object({
    bookingRequest: z.boolean().optional(),
    staffCheckin: z.boolean().optional(),
    staffCheckout: z.boolean().optional(),
    missedCheckin: z.boolean().optional(),
    missedCheckout: z.boolean().optional(),
    accountSignin: superAdminNotificationToggleSchema.optional(),
    accountInfoChanges: superAdminNotificationToggleSchema.optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one notification setting must be provided'
  });

const systemLogFilterSchema = z
  .object({
    user: z.preprocess(emptyStringToUndefined, z.enum(['Admin', 'Operation Manager', 'Staff', 'System']).optional()),
    action: z.preprocess(
      emptyStringToUndefined,
      z
        .enum([
          'Created',
          'Updated',
          'Deleted',
          'Assigned',
          'Approved',
          'Triggered',
          'Submitted',
          'Attempted',
          'Sent',
          'Cancelled'
        ])
        .optional()
    ),
    module: z.preprocess(
      emptyStringToUndefined,
      z
        .enum([
          'Clients',
          'Staff',
          'Visits',
          'Bookings',
          'Messages',
          'Settings',
          'Alerts',
          'Notification',
          'Check-in',
          'Visit logs',
          'Service'
        ])
        .optional()
    ),
    dateRange: z.preprocess(
      emptyStringToUndefined,
      z
        .enum(['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range'])
        .optional()
    ),
    startDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
    endDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
    search: optionalTrimmedString
  })
  .refine((data) => data.dateRange !== 'Custom Range' || (data.startDate && data.endDate), {
    message: 'startDate and endDate are required when dateRange is Custom Range',
    path: ['dateRange']
  });

export const systemLogQuerySchema = systemLogFilterSchema.extend({
  page: queryPage().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export const systemLogExportQuerySchema = systemLogFilterSchema.extend({
  format: z.enum(['csv', 'pdf'])
});

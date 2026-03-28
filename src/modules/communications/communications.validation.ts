import { Role } from '@prisma/client';
import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID')
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const COMM_AUDIENCE = {
  ALL_STAFF: 'ALL_STAFF',
  SELECTED_STAFF: 'SELECTED_STAFF'
} as const;

const COMM_NOTIFICATION_TYPE = {
  MESSAGE: 'MESSAGE',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  SYSTEM: 'SYSTEM'
} as const;

export const listThreadsQuerySchema = paginationSchema.extend({
  staffId: z.string().uuid().optional()
});

export const postMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  attachmentUrl: z.string().url().optional()
});

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(4000),
    audienceType: z.enum([COMM_AUDIENCE.ALL_STAFF, COMM_AUDIENCE.SELECTED_STAFF]),
    staffIds: z.array(z.string().uuid()).optional()
  })
  .superRefine((data, ctx) => {
    if (data.audienceType === COMM_AUDIENCE.SELECTED_STAFF && (!data.staffIds || data.staffIds.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'staffIds is required when audienceType is SELECTED_STAFF',
        path: ['staffIds']
      });
    }
  });

export const listNotificationsQuerySchema = paginationSchema.extend({
  type: z
    .enum([
      COMM_NOTIFICATION_TYPE.MESSAGE,
      COMM_NOTIFICATION_TYPE.ANNOUNCEMENT,
      COMM_NOTIFICATION_TYPE.SYSTEM
    ])
    .optional(),
  unreadOnly: z.coerce.boolean().optional()
});

export const markNotificationReadSchema = z.object({
  read: z.literal(true)
});

export const ensureStaffRole = (role: Role): boolean => role === Role.STAFF;

export type ListThreadsQuery = z.infer<typeof listThreadsQuerySchema>;
export type PostMessageInput = z.infer<typeof postMessageSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

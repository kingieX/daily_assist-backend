import { Role } from '@prisma/client';
import { z } from 'zod';
import { emptyStringToUndefined, optionalQueryBoolean, optionalQueryUuid, queryLimit, queryPage } from '../../utils/query-validation';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID')
});

const paginationSchema = z.object({
  page: queryPage(),
  limit: queryLimit()
});

const COMM_AUDIENCE = {
  ALL_STAFF: 'ALL_STAFF',
  SELECTED_STAFF: 'SELECTED_STAFF',
  BY_ZONE: 'BY_ZONE',
  CAR_OWNER: 'CAR_OWNER'
} as const;

const announcementSenders = ['Daily Assist Uk Office', 'Operation Manager', 'HR Department', 'System'] as const;
const announcementSendToValues = ['All Staff', 'Select Staff', 'By Zone', 'Car Owner'] as const;
const sendToAudienceMap: Record<(typeof announcementSendToValues)[number], (typeof COMM_AUDIENCE)[keyof typeof COMM_AUDIENCE]> = {
  'All Staff': COMM_AUDIENCE.ALL_STAFF,
  'Select Staff': COMM_AUDIENCE.SELECTED_STAFF,
  'By Zone': COMM_AUDIENCE.BY_ZONE,
  'Car Owner': COMM_AUDIENCE.CAR_OWNER
};

const COMM_NOTIFICATION_TYPE = {
  MESSAGE: 'MESSAGE',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  SYSTEM: 'SYSTEM'
} as const;

export const inboxQuerySchema = z.object({
  tab: z.preprocess(emptyStringToUndefined, z.enum(['all', 'announcement', 'notification']).default('all')),
  search: z.preprocess(emptyStringToUndefined, z.string().trim().optional()),
  page: queryPage(),
  pageSize: queryLimit()
});

export const newDirectMessageSchema = z.object({ staffId: z.string().uuid('Invalid staff ID'), message: z.string().trim().min(1).max(4000) });
export const replyMessageSchema = z.object({ text: z.string().trim().min(1).max(4000) });
export const bulkDeleteMessagesSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

export const listThreadsQuerySchema = paginationSchema.extend({
  staffId: optionalQueryUuid()
});

export const createThreadSchema = z.object({
  staffId: optionalQueryUuid()
});

export const postMessageSchema = z
  .object({
    body: z.string().trim().max(4000).optional(),
    attachmentUrl: z.string().url().max(2048).optional()
  })
  .superRefine((data, ctx) => {
    if (!data.body?.trim() && !data.attachmentUrl) {
      ctx.addIssue({
        code: 'custom',
        message: 'Either body or attachmentUrl is required',
        path: ['body']
      });
    }

    if (data.attachmentUrl && !/^https:\/\//i.test(data.attachmentUrl)) {
      ctx.addIssue({
        code: 'custom',
        message: 'attachmentUrl must use https',
        path: ['attachmentUrl']
      });
    }
  });

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    sender: z.enum(announcementSenders),
    sendTo: z.enum(announcementSendToValues),
    recipientIds: z.array(z.string().uuid()).default([]),
    zone: z.string().trim().min(1).max(120).optional(),
    message: z.string().trim().min(1).max(4000),
    acknowledgeRequired: z.boolean().default(false),
    visitSummary: z.boolean().default(false),
    visitCount: z.coerce.number().int().min(0).optional(),
    firstVisitTime: z.string().trim().min(1).max(40).optional(),
    lastVisitTime: z.string().trim().min(1).max(40).optional()
  })
  .superRefine((data, ctx) => {
    if (data.sendTo === 'Select Staff' && data.recipientIds.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'recipientIds is required when sendTo is Select Staff', path: ['recipientIds'] });
    }
    if (data.sendTo === 'By Zone' && !data.zone) {
      ctx.addIssue({ code: 'custom', message: 'zone is required when sendTo is By Zone', path: ['zone'] });
    }
    if (data.visitSummary) {
      if (data.visitCount === undefined) ctx.addIssue({ code: 'custom', message: 'visitCount is required when visitSummary is true', path: ['visitCount'] });
      if (!data.firstVisitTime) ctx.addIssue({ code: 'custom', message: 'firstVisitTime is required when visitSummary is true', path: ['firstVisitTime'] });
      if (!data.lastVisitTime) ctx.addIssue({ code: 'custom', message: 'lastVisitTime is required when visitSummary is true', path: ['lastVisitTime'] });
    }
  })
  .transform((data) => ({ ...data, audienceType: sendToAudienceMap[data.sendTo] }));

export const listAnnouncementsQuerySchema = z.object({
  page: queryPage(),
  pageSize: queryLimit(),
  sendTo: z.preprocess(emptyStringToUndefined, z.enum(announcementSendToValues).optional()),
  fromDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
  toDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional())
});

export const listNotificationsQuerySchema = paginationSchema.extend({
  type: z.preprocess(
    emptyStringToUndefined,
    z
      .enum([
        COMM_NOTIFICATION_TYPE.MESSAGE,
        COMM_NOTIFICATION_TYPE.ANNOUNCEMENT,
        COMM_NOTIFICATION_TYPE.SYSTEM
      ])
      .optional()
  ),
  unreadOnly: optionalQueryBoolean()
});

export const markNotificationReadSchema = z.object({
  read: z.literal(true)
});

export const updateNotificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  messageEnabled: z.boolean().optional(),
  announcementEnabled: z.boolean().optional(),
  visitEnabled: z.boolean().optional(),
  systemEnabled: z.boolean().optional()
});

export const markAnnouncementReadSchema = z.object({
  read: z.literal(true)
});

export const ensureStaffRole = (role: Role): boolean => role === Role.STAFF;

export type InboxQuery = z.infer<typeof inboxQuerySchema>;
export type NewDirectMessageInput = z.infer<typeof newDirectMessageSchema>;
export type ReplyMessageInput = z.infer<typeof replyMessageSchema>;
export type ListThreadsQuery = z.infer<typeof listThreadsQuerySchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type PostMessageInput = z.infer<typeof postMessageSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;

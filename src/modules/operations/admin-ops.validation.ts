import { z } from 'zod';
import { emptyStringToUndefined, queryLimit, queryPage } from '../../utils/query-validation';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID')
});

const paginationSchema = z.object({
  page: queryPage(),
  limit: queryLimit()
});

export const reportListQuerySchema = paginationSchema.extend({
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'BILLED']).optional()
  ),
  type: z.preprocess(
    emptyStringToUndefined,
    z.enum(['INCIDENT', 'VISIT_QUALITY', 'STAFF_PERFORMANCE', 'SYSTEM']).optional()
  )
});

export const createReportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(6000),
  type: z.enum(['INCIDENT', 'VISIT_QUALITY', 'STAFF_PERFORMANCE', 'SYSTEM'])
});

export const updateReportWorkflowSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'under_review', 'flagged', 'resolved']),
  reasonForAction: z.string().trim().min(1).max(1000)
}).transform((data) => ({
  status: ({ pending: 'NEW', reviewed: 'APPROVED', under_review: 'IN_REVIEW', flagged: 'REJECTED', resolved: 'BILLED' } as const)[data.status],
  reasonForAction: data.reasonForAction
}));

export const updateReportStatusSchema = z.object({
  status: z.enum(['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'BILLED']).optional(),
  billingProcessed: z.boolean().optional()
});

export const upsertSystemSettingSchema = z.object({
  key: z.string().trim().min(1).max(120),
  valueJson: z.record(z.string(), z.unknown())
});

export const auditLogQuerySchema = paginationSchema.extend({
  action: z.preprocess(
    emptyStringToUndefined,
    z
      .enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE', 'SETTINGS_UPDATE', 'REPORT_PROCESSING'])
    .optional()
  ),
  entity: z.preprocess(emptyStringToUndefined, z.string().trim().min(1).max(100).optional())
});

export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID')
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const reportListQuerySchema = paginationSchema.extend({
  status: z.enum(['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'BILLED']).optional(),
  type: z.enum(['INCIDENT', 'VISIT_QUALITY', 'STAFF_PERFORMANCE', 'SYSTEM']).optional()
});

export const createReportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(6000),
  type: z.enum(['INCIDENT', 'VISIT_QUALITY', 'STAFF_PERFORMANCE', 'SYSTEM'])
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'BILLED']).optional(),
  billingProcessed: z.boolean().optional()
});

export const upsertSystemSettingSchema = z.object({
  key: z.string().trim().min(1).max(120),
  valueJson: z.record(z.string(), z.unknown())
});

export const auditLogQuerySchema = paginationSchema.extend({
  action: z
    .enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE', 'SETTINGS_UPDATE', 'REPORT_PROCESSING'])
    .optional(),
  entity: z.string().trim().min(1).max(100).optional()
});

export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

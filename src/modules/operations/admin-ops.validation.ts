import { z } from 'zod';
import { emptyStringToUndefined, queryPage } from '../../utils/query-validation';

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID')
});

const reportStatusSchema = z.enum(['pending', 'reviewed', 'under_review', 'flagged', 'resolved']);
const dateRangeSchema = z.enum(['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range']);

const optionalString = z.preprocess(emptyStringToUndefined, z.string().trim().min(1).optional());

export const reportListQuerySchema = z.object({
  staff: optionalString,
  client: optionalString,
  service: optionalString,
  dateRange: z.preprocess(emptyStringToUndefined, dateRangeSchema.optional()),
  startDate: optionalString,
  endDate: optionalString,
  search: optionalString,
  page: queryPage(),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export const reportExportQuerySchema = reportListQuerySchema.omit({ page: true, pageSize: true }).extend({
  format: z.enum(['csv', 'pdf'])
});

export const updateReportStatusSchema = z.object({
  status: reportStatusSchema,
  reasonForAction: z.string().trim().max(1000).optional().default('')
});

export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;

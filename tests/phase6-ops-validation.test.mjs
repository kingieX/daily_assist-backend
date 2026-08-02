import test from 'node:test';
import assert from 'node:assert/strict';

import { reportExportQuerySchema, reportListQuerySchema, updateReportStatusSchema } from '../dist/modules/operations/admin-ops.validation.js';

test('report list accepts ReportsPage filters and pagination defaults', () => {
  const parsed = reportListQuerySchema.parse({ staff: 'Sarah Johnson', dateRange: 'Last 7 Days', page: '2', pageSize: '10' });
  assert.equal(parsed.staff, 'Sarah Johnson');
  assert.equal(parsed.dateRange, 'Last 7 Days');
  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 10);
});

test('report status update accepts modal workflow fields', () => {
  const parsed = updateReportStatusSchema.parse({ status: 'under_review', reasonForAction: 'Needs manager follow-up.' });
  assert.equal(parsed.status, 'under_review');
  assert.equal(parsed.reasonForAction, 'Needs manager follow-up.');
});

test('report export requires csv or pdf format', () => {
  const parsed = reportExportQuerySchema.parse({ format: 'csv', dateRange: 'Custom Range', startDate: '2026-07-01', endDate: '2026-07-31' });
  assert.equal(parsed.format, 'csv');
  assert.equal(parsed.dateRange, 'Custom Range');
});

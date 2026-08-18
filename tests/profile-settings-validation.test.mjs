import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteAdminAccountSchema,
  notificationSettingsSchema,
  systemLogExportQuerySchema,
  systemLogQuerySchema,
  updateAdminProfileSchema
} from '../dist/modules/admin/admin-settings.validation.js';

test('admin profile update rejects email and role changes', () => {
  assert.equal(updateAdminProfileSchema.safeParse({ firstName: 'John' }).success, true);
  assert.equal(updateAdminProfileSchema.safeParse({ email: 'new@example.com' }).success, false);
  assert.equal(updateAdminProfileSchema.safeParse({ role: 'SUPER_ADMIN' }).success, false);
});

test('admin account deactivation requires confirm true', () => {
  assert.equal(deleteAdminAccountSchema.safeParse({ confirm: true }).success, true);
  assert.equal(deleteAdminAccountSchema.safeParse({ confirm: false }).success, false);
  assert.equal(deleteAdminAccountSchema.safeParse({}).success, false);
});

test('notification settings use single-toggle frontend keys only', () => {
  assert.equal(notificationSettingsSchema.safeParse({ bookingRequest: true, staffCheckout: false }).success, true);
  assert.equal(notificationSettingsSchema.safeParse({ emailEnabled: true }).success, false);
});

test('system log query validates enums, pagination defaults, and custom date range', () => {
  const parsed = systemLogQuerySchema.parse({ action: 'ASSIGN', module: 'VISITS' });
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 10);
  assert.equal(systemLogQuerySchema.safeParse({ action: 'ARCHIVE' }).success, true);
  assert.equal(systemLogQuerySchema.safeParse({ dateRange: 'Custom Range' }).success, false);
  assert.equal(
    systemLogQuerySchema.safeParse({ dateRange: 'Custom Range', startDate: '2026-07-01', endDate: '2026-07-23' }).success,
    true
  );
});

test('system log export accepts the same filters as listing without a format parameter', () => {
  assert.equal(systemLogExportQuerySchema.safeParse({ action: 'ASSIGN', module: 'VISITS' }).success, true);
  assert.equal(systemLogExportQuerySchema.safeParse({ format: 'xlsx' }).success, true);
});

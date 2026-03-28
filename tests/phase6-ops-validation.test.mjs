import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createReportSchema,
  updateReportStatusSchema,
  upsertSystemSettingSchema,
  auditLogQuerySchema
} from '../dist/modules/operations/admin-ops.validation.js';

test('create report validates required fields', () => {
  const parsed = createReportSchema.parse({
    title: 'Incident report',
    description: 'Staff reported a no-show event.',
    type: 'INCIDENT'
  });

  assert.equal(parsed.type, 'INCIDENT');
});

test('update report status accepts billing flag', () => {
  const parsed = updateReportStatusSchema.parse({ status: 'BILLED', billingProcessed: true });
  assert.equal(parsed.status, 'BILLED');
  assert.equal(parsed.billingProcessed, true);
});

test('system setting requires key and object valueJson', () => {
  const parsed = upsertSystemSettingSchema.parse({ key: 'billing.defaultCurrency', valueJson: { code: 'USD' } });
  assert.equal(parsed.key, 'billing.defaultCurrency');
});

test('audit query supports action/entity filters', () => {
  const parsed = auditLogQuerySchema.parse({ page: '1', limit: '10', action: 'SETTINGS_UPDATE', entity: 'system_setting' });
  assert.equal(parsed.action, 'SETTINGS_UPDATE');
  assert.equal(parsed.entity, 'system_setting');
  assert.equal(parsed.page, 1);
});

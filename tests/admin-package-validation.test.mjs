import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPackageSchema,
  packageListQuerySchema,
  updatePackageSchema
} from '../dist/modules/admin/admin.validation.js';

test('admin package creation accepts frontend modal payload', () => {
  const parsed = createPackageSchema.parse({
    icon: 'Heart',
    name: 'Welfare Check-In Account',
    price: '£25',
    duration: 'per hour',
    tagline: 'Friendly check-ins and practical support for independent living.',
    features: ['Daily welfare check-in', 'Medication reminders'],
    additionalCharge: 'Transport mileage: 45p/mile'
  });

  assert.equal(parsed.icon, 'heart');
  assert.equal(parsed.name, 'Welfare Check-In Account');
  assert.equal(parsed.price, '£25');
  assert.equal(parsed.duration, 'per hour');
  assert.deepEqual(parsed.features, ['Daily welfare check-in', 'Medication reminders']);
  assert.equal(parsed.highlighted, false);
  assert.equal(parsed.isActive, true);
});

test('admin package update accepts partial edit payload', () => {
  const parsed = updatePackageSchema.parse({
    price: '£30',
    duration: 'per visit',
    features: ['Welfare check-in', 'Family update']
  });

  assert.equal(parsed.price, '£30');
  assert.equal(parsed.duration, 'per visit');
  assert.deepEqual(parsed.features, ['Welfare check-in', 'Family update']);
});

test('admin package list query supports pagination and active filter', () => {
  const parsed = packageListQuerySchema.parse({ page: '1', limit: '12', isActive: 'true' });

  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 12);
  assert.equal(parsed.isActive, true);
  assert.equal(parsed.sortBy, 'displayOrder');
  assert.equal(parsed.sortOrder, 'desc');
});

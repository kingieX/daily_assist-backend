import test from 'node:test';
import assert from 'node:assert/strict';

import { ZodError } from 'zod';
import { reportListQuerySchema } from '../dist/modules/operations/admin-ops.validation.js';
import { adminVisitListQuerySchema } from '../dist/modules/visits/visit.validation.js';
import { formatValidationError } from '../dist/utils/validation-error.js';

test('admin visits list accepts documented pagination defaults from query strings', () => {
  const parsed = adminVisitListQuerySchema.parse({ page: '1', limit: '20' });

  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 20);
  assert.equal(parsed.sortBy, 'scheduledStartAt');
  assert.equal(parsed.sortOrder, 'desc');
});

test('admin reports list accepts documented pagination query strings', () => {
  const parsed = reportListQuerySchema.parse({ page: '1', limit: '10' });

  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 10);
});

test('validation errors are serializable and include field details', () => {
  const result = adminVisitListQuerySchema.safeParse({ page: '0', limit: '101' });

  assert.equal(result.success, false);
  assert.ok(result.error instanceof ZodError);

  const formatted = formatValidationError(result.error);

  assert.deepEqual(formatted, [
    { path: 'page', message: 'Too small: expected number to be >=1', code: 'too_small' },
    { path: 'limit', message: 'Too big: expected number to be <=100', code: 'too_big' }
  ]);
  assert.notEqual(JSON.stringify(formatted), '{}');
});

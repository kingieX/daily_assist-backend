import assert from 'node:assert/strict';
import test from 'node:test';
import { Role } from '@prisma/client';
import { normalizeRole } from '../dist/utils/roles.js';

test('normalizeRole accepts enum and frontend-friendly role strings', () => {
  assert.equal(normalizeRole(Role.STAFF), Role.STAFF);
  assert.equal(normalizeRole('staff'), Role.STAFF);
  assert.equal(normalizeRole('super admin'), Role.SUPER_ADMIN);
  assert.equal(normalizeRole('super-admin'), Role.SUPER_ADMIN);
});

test('normalizeRole rejects unknown roles', () => {
  assert.equal(normalizeRole('worker'), null);
  assert.equal(normalizeRole(undefined), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '../dist/modules/visits/visit-state.js';

test('allows ASSIGNED -> ACKNOWLEDGED', () => {
  assert.equal(canTransition('ASSIGNED', 'ACKNOWLEDGED'), true);
});

test('allows ACKNOWLEDGED -> IN_PROGRESS', () => {
  assert.equal(canTransition('ACKNOWLEDGED', 'IN_PROGRESS'), true);
});

test('allows IN_PROGRESS -> COMPLETED', () => {
  assert.equal(canTransition('IN_PROGRESS', 'COMPLETED'), true);
});

test('rejects COMPLETED -> IN_PROGRESS', () => {
  assert.equal(canTransition('COMPLETED', 'IN_PROGRESS'), false);
});

test('rejects CANCELLED -> ACKNOWLEDGED', () => {
  assert.equal(canTransition('CANCELLED', 'ACKNOWLEDGED'), false);
});

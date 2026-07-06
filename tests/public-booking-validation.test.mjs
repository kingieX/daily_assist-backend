import test from 'node:test';
import assert from 'node:assert/strict';

import { createPublicBookingSchema } from '../dist/modules/public/public.validation.js';

test('public booking accepts frontend form payload with postcode and service labels', () => {
  const parsed = createPublicBookingSchema.parse({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phoneNumber: '+44 1268 904 508',
    address: '123 Church Street',
    city: 'Essex',
    postcode: 'SS8 0XY',
    packageSlug: 'welfare-check-in-account',
    packageName: 'Welfare Check-In Account',
    preferredDays: ['Monday', 'Wednesday'],
    preferredTime: 'morning',
    startDate: '2026-07-01',
    specialMessage: 'Please let us know about any specific needs.',
    selectedServices: ['Companionship', 'Medication reminders'],
    additionalServices: ['Shopping support'],
    emergencyContactName: 'Mary Doe',
    emergencyContactPhone: '+44 7000 000000',
    emergencyContactRelationship: 'Daughter',
    agreeToTerms: true,
    consentToDataProcessing: true
  });

  assert.equal(parsed.zipcode, 'SS8 0XY');
  assert.equal(parsed.consentToDailyassist, true);
  assert.deepEqual(parsed.preferredDays, ['MONDAY', 'WEDNESDAY']);
  assert.deepEqual(parsed.selectedServices, ['Companionship', 'Medication reminders']);
  assert.deepEqual(parsed.additionalServices, ['Shopping support']);
  assert.equal(parsed.packageId, undefined);
});

test('public booking still accepts existing UUID-based service payloads', () => {
  const serviceId = '11111111-1111-4111-8111-111111111111';
  const packageId = '22222222-2222-4222-8222-222222222222';

  const parsed = createPublicBookingSchema.parse({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phoneNumber: '+44 1268 904 508',
    address: '123 Church Street',
    city: 'Canvey Island',
    zipcode: 'SS8 0XY',
    packageId,
    preferredDays: ['MONDAY'],
    preferredTime: 'Morning',
    startDate: '2026-07-01T00:00:00.000Z',
    selectedServiceIds: [serviceId],
    agreeToTerms: true,
    consentToDailyassist: true
  });

  assert.equal(parsed.packageId, packageId);
  assert.deepEqual(parsed.selectedServiceIds, [serviceId]);
  assert.equal(parsed.zipcode, 'SS8 0XY');
});

test('public booking accepts form-style booleans, scalar arrays, and label values in service ID fields', () => {
  const parsed = createPublicBookingSchema.parse({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '+44 7000 123456',
    address: '1 High Street',
    selectedServiceIds: ['Welfare Check-Ins & Companionship'],
    additionalServiceIds: ['One-off Deep Clean'],
    preferredDays: 'Monday',
    preferredTime: '8:00 Am',
    preferredStartDate: '2026-07-08',
    agreeToTerms: 'on',
    consentToDataProcessing: 'true'
  });

  assert.deepEqual(parsed.selectedServiceIds, []);
  assert.deepEqual(parsed.additionalServiceIds, []);
  assert.deepEqual(parsed.selectedServices, ['Welfare Check-Ins & Companionship']);
  assert.deepEqual(parsed.additionalServices, ['One-off Deep Clean']);
  assert.deepEqual(parsed.preferredDays, ['MONDAY']);
  assert.equal(parsed.consentToDailyassist, true);
});

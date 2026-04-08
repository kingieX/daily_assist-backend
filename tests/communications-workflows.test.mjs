import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createThreadSchema,
  postMessageSchema,
  markAnnouncementReadSchema,
  updateNotificationPreferencesSchema
} from '../dist/modules/communications/communications.validation.js';

test('staff thread creation payload can omit staffId', () => {
  const parsed = createThreadSchema.parse({});
  assert.deepEqual(parsed, {});
});

test('post message accepts attachment-only payload with https URL', () => {
  const parsed = postMessageSchema.parse({ attachmentUrl: 'https://cdn.example.com/a.pdf' });
  assert.equal(parsed.attachmentUrl, 'https://cdn.example.com/a.pdf');
});

test('post message rejects payload without body and attachment', () => {
  assert.throws(() => postMessageSchema.parse({}), /Either body or attachmentUrl is required/);
});

test('post message rejects non-https attachment URL', () => {
  assert.throws(() => postMessageSchema.parse({ attachmentUrl: 'http://files.example.com/a.pdf' }), /attachmentUrl must use https/);
});

test('mark announcement read requires read=true', () => {
  const parsed = markAnnouncementReadSchema.parse({ read: true });
  assert.equal(parsed.read, true);
});

test('notification preferences accepts partial updates', () => {
  const parsed = updateNotificationPreferencesSchema.parse({ messageEnabled: false, inAppEnabled: true });
  assert.equal(parsed.messageEnabled, false);
  assert.equal(parsed.inAppEnabled, true);
});

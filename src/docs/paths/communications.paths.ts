import type { OpenAPIV3 } from 'openapi-types';

const secured: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const idParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
  description: 'Resource UUID.'
};

const paginationParameters: OpenAPIV3.ParameterObject[] = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number.' },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, description: 'Page size.' }
];

const jsonBody = (schema: OpenAPIV3.SchemaObject, example?: Record<string, unknown>): OpenAPIV3.RequestBodyObject => ({
  required: true,
  content: {
    'application/json': {
      schema,
      ...(example ? { example } : {})
    }
  }
});

const createThreadBody = jsonBody(
  {
    type: 'object',
    properties: {
      staffId: { type: 'string', format: 'uuid', description: 'Required for admins to open a thread with a specific staff member. Staff users omit this field.' }
    }
  },
  { staffId: '00000000-0000-0000-0000-000000000000' }
);

const postMessageBody = jsonBody(
  {
    type: 'object',
    properties: {
      body: { type: 'string', maxLength: 4000, description: 'Message text. Required if attachmentUrl is not provided.' },
      attachmentUrl: { type: 'string', format: 'uri', maxLength: 2048, description: 'HTTPS attachment URL. Required if body is not provided.' }
    },
    description: 'Provide at least one of body or attachmentUrl.'
  },
  { body: 'Please review this visit update.' }
);

const notificationPreferencesBody = jsonBody(
  {
    type: 'object',
    properties: {
      emailEnabled: { type: 'boolean' },
      inAppEnabled: { type: 'boolean' },
      messageEnabled: { type: 'boolean' },
      announcementEnabled: { type: 'boolean' },
      visitEnabled: { type: 'boolean' },
      systemEnabled: { type: 'boolean' }
    }
  },
  { emailEnabled: true, inAppEnabled: true, messageEnabled: true }
);

const markReadBody = jsonBody(
  {
    type: 'object',
    required: ['read'],
    properties: { read: { type: 'boolean', enum: [true] } }
  },
  { read: true }
);

export const communicationsPaths: OpenAPIV3.PathsObject = {
  '/admin/messages/threads': {
    post: {
      tags: ['Admin — Communications'],
      summary: 'Create or get admin-staff thread',
      description: 'Creates an admin/staff conversation if it does not already exist; otherwise returns the existing thread.',
      security: secured,
      requestBody: createThreadBody,
      responses: { '201': { description: 'Thread created or retrieved' } }
    },
    get: {
      tags: ['Admin — Communications'],
      summary: 'List message threads',
      description: 'Returns paginated message threads. Filter by staffId when an admin needs one staff conversation.',
      security: secured,
      parameters: [...paginationParameters, { name: 'staffId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Optional staff UUID filter.' }],
      responses: { '200': { description: 'Threads retrieved' } }
    }
  },
  '/admin/messages/threads/{id}/messages': {
    get: {
      tags: ['Admin — Communications'],
      summary: 'Get thread messages',
      description: 'Returns messages in a conversation thread.',
      security: secured,
      parameters: [idParam, ...paginationParameters],
      responses: { '200': { description: 'Messages retrieved' } }
    },
    post: {
      tags: ['Admin — Communications'],
      summary: 'Post message to thread',
      description: 'Sends a text message and/or an HTTPS attachment URL to the selected thread.',
      security: secured,
      parameters: [idParam],
      requestBody: postMessageBody,
      responses: { '201': { description: 'Message sent' } }
    }
  },
  '/admin/messages/{id}': {
    delete: {
      tags: ['Admin — Communications'],
      summary: 'Soft-delete message',
      description: 'Soft-deletes a message so it no longer appears in active message views.',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Message deleted' } }
    }
  },
  '/admin/announcements': {
    get: {
      tags: ['Admin — Communications'],
      summary: 'List announcements',
      description: 'Returns paginated announcements created for staff audiences.',
      security: secured,
      parameters: paginationParameters,
      responses: { '200': { description: 'Announcements retrieved' } }
    },
    post: {
      tags: ['Admin — Communications'],
      summary: 'Create announcement',
      description: 'Creates an announcement for all staff or selected staff members.',
      security: secured,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['title', 'body', 'audienceType'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            body: { type: 'string', minLength: 1, maxLength: 4000 },
            audienceType: { type: 'string', enum: ['ALL_STAFF', 'SELECTED_STAFF'] },
            staffIds: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Required when audienceType is SELECTED_STAFF.' }
          }
        },
        { title: 'Schedule reminder', body: 'Please check your visits for tomorrow.', audienceType: 'ALL_STAFF' }
      ),
      responses: { '201': { description: 'Announcement created' } }
    }
  },
  '/admin/announcements/{id}': {
    delete: {
      tags: ['Admin — Communications'],
      summary: 'Delete announcement',
      description: 'Deletes an announcement by UUID.',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Announcement deleted' } }
    }
  },
  '/admin/notifications/history': {
    get: {
      tags: ['Admin — Communications'],
      summary: 'List admin notification history',
      description: 'Returns paginated notification history. Use type and unreadOnly filters for inbox views.',
      security: secured,
      parameters: [
        ...paginationParameters,
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['MESSAGE', 'ANNOUNCEMENT', 'SYSTEM'] } },
        { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } }
      ],
      responses: { '200': { description: 'Notifications retrieved' } }
    }
  },
  '/admin/notifications/{id}': {
    delete: {
      tags: ['Admin — Communications'],
      summary: 'Delete notification',
      description: 'Deletes one notification from the authenticated admin notification history.',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Notification deleted' } }
    }
  },

  '/admin/notifications/preferences': {
    get: {
      tags: ['Admin — Communications'],
      summary: 'Get admin notification preferences',
      description: 'Returns notification channel preferences for the authenticated admin.',
      security: secured,
      responses: { '200': { description: 'Notification preferences retrieved' } }
    },
    patch: {
      tags: ['Admin — Communications'],
      summary: 'Update admin notification preferences',
      description: 'Updates notification channel preferences for the authenticated admin. Omitted fields remain unchanged.',
      security: secured,
      requestBody: notificationPreferencesBody,
      responses: { '200': { description: 'Notification preferences updated' } }
    }
  },
  '/staff/messages/threads': {
    post: {
      tags: ['Staff — Communications'],
      summary: 'Create or get own staff thread',
      description: 'Creates or returns the authenticated staff member’s support thread. Staff users do not send staffId.',
      security: secured,
      requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: {} }, example: {} } } },
      responses: { '201': { description: 'Thread created or retrieved' } }
    },
    get: {
      tags: ['Staff — Communications'],
      summary: 'List staff message threads',
      description: 'Returns the authenticated staff member’s available message threads.',
      security: secured,
      parameters: paginationParameters,
      responses: { '200': { description: 'Threads retrieved' } }
    }
  },
  '/staff/messages/threads/{id}/messages': {
    get: {
      tags: ['Staff — Communications'],
      summary: 'Get staff thread messages',
      description: 'Returns messages for a thread owned by the authenticated staff member.',
      security: secured,
      parameters: [idParam, ...paginationParameters],
      responses: { '200': { description: 'Messages retrieved' } }
    },
    post: {
      tags: ['Staff — Communications'],
      summary: 'Post message in staff thread',
      description: 'Sends a text message and/or an HTTPS attachment URL in the staff member’s thread.',
      security: secured,
      parameters: [idParam],
      requestBody: postMessageBody,
      responses: { '201': { description: 'Message sent' } }
    }
  },
  '/staff/messages/{id}': {
    delete: {
      tags: ['Staff — Communications'],
      summary: 'Soft-delete staff message',
      description: 'Soft-deletes a message owned by the authenticated staff member.',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Message deleted' } }
    }
  },
  '/staff/announcements': {
    get: {
      tags: ['Staff — Communications'],
      summary: 'List staff announcements',
      description: 'Returns announcements visible to the authenticated staff member.',
      security: secured,
      parameters: paginationParameters,
      responses: { '200': { description: 'Announcements retrieved' } }
    }
  },

  '/staff/announcements/{id}/read': {
    patch: {
      tags: ['Staff — Communications'],
      summary: 'Mark staff announcement as read',
      description: 'Marks an announcement as read for the authenticated staff member.',
      security: secured,
      parameters: [idParam],
      requestBody: markReadBody,
      responses: { '200': { description: 'Announcement marked as read' } }
    }
  },
  '/staff/notifications': {
    get: {
      tags: ['Staff — Communications'],
      summary: 'List staff notifications',
      description: 'Returns notification history for the authenticated staff member.',
      security: secured,
      parameters: [
        ...paginationParameters,
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['MESSAGE', 'ANNOUNCEMENT', 'SYSTEM'] } },
        { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } }
      ],
      responses: { '200': { description: 'Notifications retrieved' } }
    }
  },

  '/staff/notifications/preferences': {
    get: {
      tags: ['Staff — Communications'],
      summary: 'Get staff notification preferences',
      description: 'Returns notification channel preferences for the authenticated staff member.',
      security: secured,
      responses: { '200': { description: 'Notification preferences retrieved' } }
    },
    patch: {
      tags: ['Staff — Communications'],
      summary: 'Update staff notification preferences',
      description: 'Updates notification channel preferences for the authenticated staff member. Omitted fields remain unchanged.',
      security: secured,
      requestBody: notificationPreferencesBody,
      responses: { '200': { description: 'Notification preferences updated' } }
    }
  },
  '/staff/notifications/{id}/read': {
    patch: {
      tags: ['Staff — Communications'],
      summary: 'Mark staff notification as read',
      description: 'Marks a notification as read for the authenticated staff member.',
      security: secured,
      parameters: [idParam],
      requestBody: markReadBody,
      responses: { '200': { description: 'Notification marked as read' } }
    }
  }
};

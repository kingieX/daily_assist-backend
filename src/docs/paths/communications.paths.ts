import type { OpenAPIV3 } from 'openapi-types';

const secured: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const idParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

export const communicationsPaths: OpenAPIV3.PathsObject = {
  '/admin/messages/threads': {
    get: {
      tags: ['Admin — Communications'],
      summary: 'List message threads',
      security: secured,
      responses: { '200': { description: 'Threads retrieved' } }
    }
  },
  '/admin/messages/threads/{id}/messages': {
    get: {
      tags: ['Admin — Communications'],
      summary: 'Get thread messages',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Messages retrieved' } }
    },
    post: {
      tags: ['Admin — Communications'],
      summary: 'Post message to thread',
      security: secured,
      parameters: [idParam],
      responses: { '201': { description: 'Message sent' } }
    }
  },
  '/admin/messages/{id}': {
    delete: {
      tags: ['Admin — Communications'],
      summary: 'Soft-delete message',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Message deleted' } }
    }
  },
  '/admin/announcements': {
    get: {
      tags: ['Admin — Communications'],
      summary: 'List announcements',
      security: secured,
      responses: { '200': { description: 'Announcements retrieved' } }
    },
    post: {
      tags: ['Admin — Communications'],
      summary: 'Create announcement',
      security: secured,
      responses: { '201': { description: 'Announcement created' } }
    }
  },
  '/admin/announcements/{id}': {
    delete: {
      tags: ['Admin — Communications'],
      summary: 'Delete announcement',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Announcement deleted' } }
    }
  },
  '/admin/notifications/history': {
    get: {
      tags: ['Admin — Communications'],
      summary: 'List admin notification history',
      security: secured,
      responses: { '200': { description: 'Notifications retrieved' } }
    }
  },
  '/admin/notifications/{id}': {
    delete: {
      tags: ['Admin — Communications'],
      summary: 'Delete notification',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Notification deleted' } }
    }
  },
  '/staff/messages/threads': {
    get: {
      tags: ['Staff — Communications'],
      summary: 'List staff message threads',
      security: secured,
      responses: { '200': { description: 'Threads retrieved' } }
    }
  },
  '/staff/messages/threads/{id}/messages': {
    get: {
      tags: ['Staff — Communications'],
      summary: 'Get staff thread messages',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Messages retrieved' } }
    },
    post: {
      tags: ['Staff — Communications'],
      summary: 'Post message in staff thread',
      security: secured,
      parameters: [idParam],
      responses: { '201': { description: 'Message sent' } }
    }
  },
  '/staff/messages/{id}': {
    delete: {
      tags: ['Staff — Communications'],
      summary: 'Soft-delete staff message',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Message deleted' } }
    }
  },
  '/staff/announcements': {
    get: {
      tags: ['Staff — Communications'],
      summary: 'List staff announcements',
      security: secured,
      responses: { '200': { description: 'Announcements retrieved' } }
    }
  },
  '/staff/notifications': {
    get: {
      tags: ['Staff — Communications'],
      summary: 'List staff notifications',
      security: secured,
      responses: { '200': { description: 'Notifications retrieved' } }
    }
  },
  '/staff/notifications/{id}/read': {
    patch: {
      tags: ['Staff — Communications'],
      summary: 'Mark staff notification as read',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Notification marked as read' } }
    }
  }
};

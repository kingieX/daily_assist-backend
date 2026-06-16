import type { OpenAPIV3 } from 'openapi-types';

const adminSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];
const staffSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const visitIdParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

export const visitPaths: OpenAPIV3.PathsObject = {
  '/staff/dashboard/summary': {
    get: {
      tags: ['Staff — Visits'],
      summary: 'Get staff dashboard summary',
      description:
        'Returns today visit counts by status, the next scheduled actionable visit, recent completed visits, and completion-rate metrics.',
      security: staffSecurity,
      responses: { '200': { description: 'Staff dashboard summary retrieved' } }
    }
  },
  '/admin/visits': {
    get: {
      tags: ['Admin — Visits'],
      summary: 'List visits',
      description:
        'Example request: `GET /api/v1/admin/visits?page=1&limit=20`. Query values are accepted as URL strings and coerced to integers during validation.',
      security: adminSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, example: 1 },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, example: 20 },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
          }
        },
        { name: 'staffId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'bookingId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        {
          name: 'sortBy',
          in: 'query',
          schema: { type: 'string', enum: ['scheduledStartAt', 'createdAt', 'updatedAt'], default: 'scheduledStartAt' }
        },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
      ],
      responses: {
        '200': {
          description: 'Visits retrieved',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Visits retrieved',
                data: { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' }
      }
    },
    post: {
      tags: ['Admin — Visits'],
      summary: 'Create/assign a visit',
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['bookingId', 'staffId', 'scheduledStartAt', 'scheduledEndAt'],
              properties: {
                bookingId: { type: 'string', format: 'uuid' },
                staffId: { type: 'string', format: 'uuid' },
                scheduledStartAt: { type: 'string', format: 'date-time' },
                scheduledEndAt: { type: 'string', format: 'date-time' },
                adminNotes: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { '201': { description: 'Visit created' } }
    }
  },
  '/admin/visits/{id}': {
    get: {
      tags: ['Admin — Visits'],
      summary: 'Get visit details',
      security: adminSecurity,
      parameters: [visitIdParam],
      responses: { '200': { description: 'Visit retrieved' }, '404': { $ref: '#/components/responses/NotFound' } }
    },
    patch: {
      tags: ['Admin — Visits'],
      summary: 'Edit visit details',
      security: adminSecurity,
      parameters: [visitIdParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                scheduledStartAt: { type: 'string', format: 'date-time' },
                scheduledEndAt: { type: 'string', format: 'date-time' },
                adminNotes: { type: 'string' },
                staffNotes: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { '200': { description: 'Visit updated' } }
    }
  },
  '/admin/visits/{id}/reassign': {
    post: {
      tags: ['Admin — Visits'],
      summary: 'Reassign visit to another staff',
      security: adminSecurity,
      parameters: [visitIdParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['staffId'], properties: { staffId: { type: 'string', format: 'uuid' } } }
          }
        }
      },
      responses: { '200': { description: 'Visit reassigned' } }
    }
  },
  '/admin/visits/{id}/cancel': {
    post: {
      tags: ['Admin — Visits'],
      summary: 'Cancel visit',
      security: adminSecurity,
      parameters: [visitIdParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } }
          }
        }
      },
      responses: { '200': { description: 'Visit cancelled' } }
    }
  },
  '/staff/visits/today': {
    get: {
      tags: ['Staff — Visits'],
      summary: 'Get today assigned visits',
      security: staffSecurity,
      responses: { '200': { description: 'Today visits retrieved' } }
    }
  },
  '/staff/visits/history': {
    get: {
      tags: ['Staff — Visits'],
      summary: 'Get staff visit history',
      security: staffSecurity,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
      ],
      responses: { '200': { description: 'Visit history retrieved' } }
    }
  },
  '/staff/visits/{id}': {
    get: {
      tags: ['Staff — Visits'],
      summary: 'Get visit by ID',
      security: staffSecurity,
      parameters: [visitIdParam],
      responses: { '200': { description: 'Visit retrieved' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/staff/visits/{id}/acknowledge': {
    post: {
      tags: ['Staff — Visits'],
      summary: 'Acknowledge assigned visit',
      security: staffSecurity,
      parameters: [visitIdParam],
      responses: { '200': { description: 'Visit acknowledged' } }
    }
  },
  '/staff/visits/{id}/check-in': {
    post: {
      tags: ['Staff — Visits'],
      summary: 'Check in to visit',
      security: staffSecurity,
      parameters: [visitIdParam],
      responses: { '200': { description: 'Check-in successful' } }
    }
  },
  '/staff/visits/{id}/check-out': {
    post: {
      tags: ['Staff — Visits'],
      summary: 'Check out from visit',
      security: staffSecurity,
      parameters: [visitIdParam],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { completionSummary: { type: 'string' }, staffNotes: { type: 'string' } }
            }
          }
        }
      },
      responses: { '200': { description: 'Check-out successful' } }
    }
  }
};

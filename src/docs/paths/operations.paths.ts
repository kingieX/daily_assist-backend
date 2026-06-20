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
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number.', example: 1 },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, description: 'Page size.', example: 10 }
];

const jsonBody = (schema: OpenAPIV3.SchemaObject, example?: Record<string, unknown>): OpenAPIV3.RequestBodyObject => ({
  required: true,
  content: { 'application/json': { schema, ...(example ? { example } : {}) } }
});

export const operationsPaths: OpenAPIV3.PathsObject = {
  '/admin/reports': {
    get: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'List reports',
      description:
        'Returns paginated operational reports. Example request: `GET /api/v1/admin/reports?page=1&limit=10`. Query values are accepted as URL strings and coerced to integers during validation.',
      security: secured,
      parameters: [
        ...paginationParameters,
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'BILLED'] } },
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['INCIDENT', 'VISIT_QUALITY', 'STAFF_PERFORMANCE', 'SYSTEM'] } }
      ],
      responses: {
        '200': {
          description: 'Reports retrieved',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Reports retrieved',
                data: { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' }
      }
    },
    post: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Create report',
      description: 'Creates an operational report. The authenticated admin is stored as creator.',
      security: secured,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['title', 'description', 'type'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', minLength: 1, maxLength: 6000 },
            type: { type: 'string', enum: ['INCIDENT', 'VISIT_QUALITY', 'STAFF_PERFORMANCE', 'SYSTEM'] }
          }
        },
        { title: 'Late visit follow-up', description: 'Client reported a delayed arrival.', type: 'INCIDENT' }
      ),
      responses: { '201': { description: 'Report created' } }
    }
  },
  '/admin/reports/{id}': {
    get: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Get report by id',
      description: 'Returns one operational report by UUID.',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Report retrieved' }, '404': { $ref: '#/components/responses/NotFound' } }
    },
    delete: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Delete report',
      description: 'Deletes one operational report by UUID.',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Report deleted' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/reports/{id}/status': {
    patch: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Update report status and billing flag',
      description: 'Updates the workflow status and/or billingProcessed flag for a report. At least one field should be sent.',
      security: secured,
      parameters: [idParam],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'BILLED'] },
            billingProcessed: { type: 'boolean' }
          }
        },
        { status: 'IN_REVIEW', billingProcessed: false }
      ),
      responses: { '200': { description: 'Report updated' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/settings/system': {
    get: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'List system settings',
      description: 'Returns all stored system settings as key/value JSON entries.',
      security: secured,
      responses: { '200': { description: 'System settings retrieved' } }
    },
    put: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Upsert one system setting',
      description: 'Creates or updates a system setting by key. valueJson must be a JSON object.',
      security: secured,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['key', 'valueJson'],
          properties: {
            key: { type: 'string', minLength: 1, maxLength: 120 },
            valueJson: { type: 'object', additionalProperties: true }
          }
        },
        { key: 'publicBooking.enabled', valueJson: { enabled: true } }
      ),
      responses: { '200': { description: 'System setting upserted' } }
    }
  },
  '/admin/settings/system/{id}': {
    delete: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Delete system setting',
      description: 'Deletes one system setting by UUID.',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'System setting deleted' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/audit-logs': {
    get: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'List audit logs',
      description: 'Returns paginated audit trail entries. Use action/entity filters for admin activity views.',
      security: secured,
      parameters: [
        ...paginationParameters,
        { name: 'action', in: 'query', schema: { type: 'string', enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE', 'SETTINGS_UPDATE', 'REPORT_PROCESSING'] } },
        { name: 'entity', in: 'query', schema: { type: 'string', maxLength: 100 } }
      ],
      responses: { '200': { description: 'Audit logs retrieved' } }
    }
  }
};

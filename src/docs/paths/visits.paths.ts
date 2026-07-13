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
      tags: ['Admin — Visits'], summary: 'List staff visit summaries', security: adminSecurity,
      description: 'Returns all active staff enriched with today’s visit counts for the staff-card schedule view. Current period is today (UTC). Cancelled visits are excluded so task counts drop after cancellation.',
      responses: { '200': { description: 'Visits retrieved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/StaffVisitSummary' } } } }] } } } } }
    },
    post: {
      tags: ['Admin — Visits'], summary: 'Assign a new visit', security: adminSecurity,
      description: 'Creates a visit with status Assigned/ASSIGNED and notifies the assigned staff member. staffId must come from GET /admin/staff. clientId remains nullable for free-text client names, which is a data-integrity gap for client history until a client-linking flow exists.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['clientName', 'address', 'date', 'startTime', 'endTime', 'staffId', 'package'], properties: { clientTitle: { type: 'string', enum: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'] }, clientName: { type: 'string' }, address: { type: 'string' }, date: { type: 'string', format: 'date' }, startTime: { type: 'string' }, endTime: { type: 'string' }, staffId: { type: 'string', format: 'uuid' }, package: { type: 'string', enum: ['Basic Package', 'Standard Package', 'Premium Package'] }, selectedServiceTypes: { type: 'array', items: { type: 'string' } }, selectedAdditional: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } } } } } },
      responses: { '201': { description: 'Visit created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Visit' } } }] } } } }, '400': { $ref: '#/components/responses/ValidationError' } }
    }
  },
  '/admin/visits/{staffId}': {
    get: {
      tags: ['Admin — Visits'], summary: 'Get staff tasks', security: adminSecurity,
      description: 'Returns a staff profile with all non-cancelled tasks. The path parameter is a staffId, not a visit ID (changed from the old GET /admin/visits/{id} behaviour). ownsCar is mapped from the staff profile, trainingUpToDate currently defaults to false, and milesCovered defaults to "0 miles".',
      parameters: [{ name: 'staffId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Staff visits retrieved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/StaffWithTasks' } } }] } } } }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/visits/{staffId}/tasks/{taskId}': {
    get: {
      tags: ['Admin — Visits'], summary: 'Get staff task details', security: adminSecurity,
      description: 'Returns one visit assigned to the given staff member. The time field is a derived display string from the stored schedule and should not be written directly.',
      parameters: [{ name: 'staffId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }, { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Visit retrieved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Visit' } } }] } } } }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/visits/{id}': {
    patch: {
      tags: ['Admin — Visits'], summary: 'Edit visit details', security: adminSecurity,
      description: 'Edits a visit by visit ID. If staffId changes, this is treated as a reassignment and both old and new staff members are notified.',
      parameters: [visitIdParam],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Visit' } } } },
      responses: { '200': { description: 'Visit updated' } }
    }
  },
  '/admin/visits/{id}/reassign': {
    post: { tags: ['Admin — Visits'], summary: 'Reassign visit to another staff', security: adminSecurity, description: 'Full visit resubmission with a new staffId. Notifies both the previous and new staff members.', parameters: [visitIdParam], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Visit' } } } }, responses: { '200': { description: 'Visit reassigned' } } }
  },
  '/admin/visits/{id}/cancel': {
    post: { tags: ['Admin — Visits'], summary: 'Cancel visit', security: adminSecurity, description: 'Soft-cancels the visit using the database CANCELLED state, notifies assigned staff, and excludes it from staff task lists/counts.', parameters: [visitIdParam], requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { '200': { description: 'Visit cancelled' } } }
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

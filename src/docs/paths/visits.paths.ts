import type { OpenAPIV3 } from 'openapi-types';

const adminSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];
const staffSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const visitIdParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

const staffVisitListItemSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['id', 'clientName', 'address', 'task', 'date', 'timeStart', 'timeEnd', 'status'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    clientName: { type: 'string' },
    address: { type: 'string' },
    task: { type: 'string', example: 'Meal Prep' },
    date: { type: 'string', format: 'date' },
    timeStart: { type: 'string', example: '1:00pm' },
    timeEnd: { type: 'string', example: '2:00pm' },
    status: { type: 'string', enum: ['not-started', 'in-progress', 'completed'] }
  }
};

const staffVisitDetailSchema: OpenAPIV3.SchemaObject = {
  allOf: [
    staffVisitListItemSchema,
    {
      type: 'object',
      required: ['additionalNote', 'checkInAt', 'checkOutAt'],
      properties: {
        additionalNote: { type: 'string' },
        checkInAt: { type: 'string', format: 'date-time', nullable: true },
        checkOutAt: { type: 'string', format: 'date-time', nullable: true }
      }
    }
  ]
};

const staffDashboardSummarySchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['greeting', 'workerName', 'visitsToday', 'completed', 'remaining', 'milesCovered', 'nextVisit'],
  properties: {
    greeting: { type: 'string', enum: ['Good morning', 'Good afternoon', 'Good evening'] },
    workerName: { type: 'string' },
    visitsToday: { type: 'integer', minimum: 0 },
    completed: { type: 'integer', minimum: 0 },
    remaining: { type: 'integer', minimum: 0 },
    milesCovered: { type: 'string', example: '12 miles' },
    nextVisit: { ...staffVisitListItemSchema, nullable: true }
  }
};

const staffAlertSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['id', 'type', 'title', 'message', 'relatedVisitId', 'relatedAnnouncementId', 'createdAt', 'read'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['new_visit', 'visit_reminder', 'announcement'] },
    title: { type: 'string' },
    message: { type: 'string' },
    relatedVisitId: { type: 'string', nullable: true },
    relatedAnnouncementId: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    read: { type: 'boolean' }
  }
};

const visitLogSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['id', 'visitTypes', 'otherService', 'miles', 'notes', 'signature', 'confirmed', 'submittedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    visitTypes: { type: 'array', items: { type: 'string' } },
    otherService: { type: 'string' },
    miles: { type: 'number' },
    notes: { type: 'string' },
    signature: { type: 'string' },
    confirmed: { type: 'boolean' },
    submittedAt: { type: 'string', format: 'date-time' }
  }
};

const staffVisitQueryParams: OpenAPIV3.ParameterObject[] = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'status', in: 'query', schema: { type: 'string', enum: ['not-started', 'in-progress', 'completed'] } },
  { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
  { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
  { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
];

function successData(data: OpenAPIV3.SchemaObject): OpenAPIV3.ResponseObject {
  return {
    description: 'Successful response',
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            { type: 'object', properties: { data } }
          ]
        }
      }
    }
  };
}

export const visitPaths: OpenAPIV3.PathsObject = {
  '/staff/dashboard/summary': {
    get: {
      tags: ['Staff — Dashboard'],
      summary: 'Get staff dashboard summary',
      description: 'Returns Today’s Overview for the authenticated staff member only, including log-derived mileage and the next non-completed visit for today.',
      security: staffSecurity,
      responses: { '200': successData(staffDashboardSummarySchema) }
    }
  },
  '/staff/alerts': {
    get: {
      tags: ['Staff — Dashboard'],
      summary: 'List staff alerts',
      description: 'Returns a unified feed of new visit notifications, generated visit reminders within the check-in window, and announcement notifications for the authenticated staff member.',
      security: staffSecurity,
      responses: { '200': successData({ type: 'array', items: staffAlertSchema }) }
    }
  },
  '/staff/alerts/{id}/read': {
    patch: {
      tags: ['Staff — Dashboard'],
      summary: 'Mark a staff alert as read',
      security: staffSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': successData(staffAlertSchema), '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/staff/alerts/read-all': {
    patch: {
      tags: ['Staff — Dashboard'],
      summary: 'Mark all staff alerts as read',
      security: staffSecurity,
      responses: { '200': successData({ type: 'object', properties: { read: { type: 'boolean' } } }) }
    }
  },
  '/admin/visits': {
    get: {
      tags: ['Admin Dashboard'], summary: 'List admin dashboard visits', security: adminSecurity,
      description: 'Paginated all-staff visit table for the AdminDashboard. Defaults to today when date is omitted; supports date, status, staffId, and clientId filters. Computes the admin-only late status when the scheduled start has passed without check-in; confirm whether staff-facing endpoints should also surface late.',
      parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }, { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['not-started', 'in-progress', 'completed', 'late'] } }, { name: 'staffId', in: 'query', schema: { type: 'string', format: 'uuid' } }, { name: 'clientId', in: 'query', schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Visits retrieved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/AdminDashboardVisit' } }, pagination: { $ref: '#/components/schemas/PaginationMeta' } } } } }] } } } } }
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
      description: 'Returns visits assigned to the authenticated staff member for the current day, sorted by start time ascending.',
      security: staffSecurity,
      responses: { '200': successData({ type: 'array', items: staffVisitListItemSchema }) }
    }
  },
  '/staff/visits/history': {
    get: {
      tags: ['Staff — Visits'],
      summary: 'Get staff visit history',
      description: 'Returns completed visits and visits whose date has passed for the authenticated staff member only. Defaults to most recent first.',
      security: staffSecurity,
      parameters: staffVisitQueryParams,
      responses: { '200': successData({ type: 'object', properties: { items: { type: 'array', items: staffVisitListItemSchema }, pagination: { type: 'object' } } }) }
    }
  },
  '/staff/visits/future': {
    get: {
      tags: ['Staff — Visits'],
      summary: 'Get future staff visits',
      description: 'Returns visits assigned to the authenticated staff member after today, sorted by date/start time ascending.',
      security: staffSecurity,
      responses: { '200': successData({ type: 'array', items: staffVisitListItemSchema }) }
    }
  },
  '/staff/visits': {
    get: {
      tags: ['Staff — Visits'],
      summary: 'Get all staff visits',
      description: 'Returns past, current, and future visits assigned to the authenticated staff member, with pagination and optional status/date filtering.',
      security: staffSecurity,
      parameters: staffVisitQueryParams,
      responses: { '200': successData({ type: 'object', properties: { items: { type: 'array', items: staffVisitListItemSchema }, pagination: { type: 'object' } } }) }
    }
  },
  '/staff/visits/{id}': {
    get: {
      tags: ['Staff — Visits'],
      summary: 'Get staff visit detail',
      description: 'Returns full detail for one visit assigned to the authenticated staff member. Returns 404 when the visit belongs to another staff member or does not exist.',
      security: staffSecurity,
      parameters: [visitIdParam],
      responses: { '200': successData(staffVisitDetailSchema), '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/staff/visits/{id}/check-in': {
    post: {
      tags: ['Staff — Visits'],
      summary: 'Check in to a staff visit',
      description: 'Moves an assigned staff visit to in-progress and records the server check-in timestamp. Returns 409 if already in progress or completed.',
      security: staffSecurity,
      parameters: [visitIdParam],
      responses: {
        '200': successData({ type: 'object', properties: { id: { type: 'string', format: 'uuid' }, status: { type: 'string', enum: ['in-progress'] }, checkInAt: { type: 'string', format: 'date-time' } } }),
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' }
      }
    }
  },
  '/staff/visits/{id}/check-out': {
    post: {
      tags: ['Staff — Visits'],
      summary: 'Check out of a staff visit and submit the visit log',
      description: 'Completes an in-progress staff visit, records the server check-out timestamp, and persists the submitted log sheet against the visit.',
      security: staffSecurity,
      parameters: [visitIdParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['notes', 'signature', 'confirmed'],
              properties: {
                visitTypes: { type: 'array', items: { type: 'string' } },
                otherService: { type: 'string' },
                miles: { type: 'number', minimum: 0 },
                notes: { type: 'string' },
                signature: { type: 'string' },
                confirmed: { type: 'boolean', enum: [true] }
              }
            }
          }
        }
      },
      responses: {
        '200': successData({ type: 'object', properties: { id: { type: 'string', format: 'uuid' }, status: { type: 'string', enum: ['completed'] }, checkOutAt: { type: 'string', format: 'date-time' }, log: visitLogSchema } }),
        '400': { $ref: '#/components/responses/ValidationError' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' }
      }
    }
  }
};

import type { OpenAPIV3 } from 'openapi-types';

const secured: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const idParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
  description: 'Visit log report UUID.'
};

const reportFilters: OpenAPIV3.ParameterObject[] = [
  { name: 'staff', in: 'query', schema: { type: 'string' }, description: "Exact match against the assigned staff member's name." },
  { name: 'client', in: 'query', schema: { type: 'string' }, description: "Exact match against the client's name." },
  { name: 'service', in: 'query', schema: { type: 'string' }, description: 'Exact match against the service/visit type.' },
  { name: 'dateRange', in: 'query', schema: { type: 'string', enum: ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range'] } },
  { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Custom Range start date.' },
  { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Custom Range end date.' },
  { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Free-text match against staff name, client name, and service.' }
];

const statusSchema: OpenAPIV3.SchemaObject = { type: 'string', enum: ['pending', 'reviewed', 'under_review', 'flagged', 'resolved'] };

const jsonBody = (schema: OpenAPIV3.SchemaObject, example?: Record<string, unknown>): OpenAPIV3.RequestBodyObject => ({
  required: true,
  content: { 'application/json': { schema, ...(example ? { example } : {}) } }
});

export const operationsPaths: OpenAPIV3.PathsObject = {
  '/admin/reports': {
    get: {
      tags: ['Admin — Reports'],
      summary: 'List admin reports from staff check-out visit logs',
      description:
        'Returns paginated report summary rows for ReportsPage. These reports are the same underlying visit log records created by POST /staff/visits/{id}/check-out; they are not independently authored report resources.',
      security: secured,
      parameters: [
        ...reportFilters,
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
      ],
      responses: {
        '200': {
          description: 'Reports retrieved',
          content: { 'application/json': { example: { success: true, message: 'Reports retrieved', data: { items: [{ id: 'rpt-1023', date: '22 Jul 2026', staff: 'Sarah Johnson', client: 'Mrs. Alan', service: 'Meal Prep', visitTime: '1:00pm - 2:00pm', status: 'pending' }], page: 1, pageSize: 10, total: 143 } } } }
        },
        '400': { $ref: '#/components/responses/ValidationError' }
      }
    }
  },
  '/admin/reports/filters': {
    get: {
      tags: ['Admin — Reports'],
      summary: 'List report filter options',
      description: 'Returns distinct staff, client, and service values present across all check-out visit log reports.',
      security: secured,
      responses: { '200': { description: 'Report filters retrieved', content: { 'application/json': { example: { success: true, message: 'Report filters retrieved', data: { staff: ['Sarah Johnson', 'Mark Reid'], clients: ['Mrs. Alan'], services: ['Meal Prep'] } } } } } }
    }
  },
  '/admin/reports/{id}': {
    get: {
      tags: ['Admin — Reports'],
      summary: 'Get report detail from a staff check-out visit log',
      description: 'Returns ReportDetailsModal fields for one visit log created by POST /staff/visits/{id}/check-out.',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Report retrieved' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/reports/{id}/status': {
    patch: {
      tags: ['Admin — Reports'],
      summary: 'Update report status and reason',
      description: 'Updates the review status and reasonForAction stored on the check-out visit log report.',
      security: secured,
      parameters: [idParam],
      requestBody: jsonBody({ type: 'object', required: ['status'], properties: { status: statusSchema, reasonForAction: { type: 'string', maxLength: 1000 } } }, { status: 'under_review', reasonForAction: 'Needs manager follow-up.' }),
      responses: { '200': { description: 'Report updated' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/reports/export': {
    get: {
      tags: ['Admin — Reports'],
      summary: 'Export filtered reports',
      description: 'Exports the full filtered check-out visit log report set as CSV or PDF. PDF clients should download this response instead of using window.print().',
      security: secured,
      parameters: [...reportFilters, { name: 'format', in: 'query', required: true, schema: { type: 'string', enum: ['csv', 'pdf'] } }],
      responses: { '200': { description: 'Downloadable reports file', headers: { 'Content-Disposition': { schema: { type: 'string' } } }, content: { 'text/csv': { schema: { type: 'string' } }, 'application/pdf': { schema: { type: 'string', format: 'binary' } } } }, '400': { $ref: '#/components/responses/ValidationError' } }
    }
  }
};

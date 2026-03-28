import type { OpenAPIV3 } from 'openapi-types';

const secured: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const idParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

export const operationsPaths: OpenAPIV3.PathsObject = {
  '/admin/reports': {
    get: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'List reports',
      security: secured,
      responses: { '200': { description: 'Reports retrieved' } }
    },
    post: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Create report',
      security: secured,
      responses: { '201': { description: 'Report created' } }
    }
  },
  '/admin/reports/{id}': {
    get: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Get report by id',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Report retrieved' } }
    }
  },
  '/admin/reports/{id}/status': {
    patch: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Update report status and billing flag',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Report updated' } }
    }
  },
  '/admin/settings/system': {
    get: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'List system settings',
      security: secured,
      responses: { '200': { description: 'System settings retrieved' } }
    },
    put: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'Upsert one system setting',
      security: secured,
      responses: { '200': { description: 'System setting upserted' } }
    }
  },
  '/admin/audit-logs': {
    get: {
      tags: ['Admin — Phase 6 Ops'],
      summary: 'List audit logs',
      security: secured,
      responses: { '200': { description: 'Audit logs retrieved' } }
    }
  }
};

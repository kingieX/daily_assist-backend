import type { OpenAPIV3 } from 'openapi-types';

const superAdminSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];
const tag = 'Admin — Sub-Admin Management';
const idParam: OpenAPIV3.ParameterObject = { name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^DA\\d{4}$', example: 'DA0013' } };
const superOnly = 'Requires a bearer token for a SUPER_ADMIN user; regular ADMIN users must receive 403. The OpenAPI security scheme only models bearer auth, so handlers additionally enforce the caller role.';
const envelope = (schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): OpenAPIV3.ResponseObject => ({ description: 'Success', content: { 'application/json': { schema: { type: 'object' as const, properties: { success: { type: 'boolean' as const }, message: { type: 'string' as const }, data: schema } } } } });

export const subAdminPaths: OpenAPIV3.PathsObject = {
  '/admin/sub-admin': {
    get: {
      tags: [tag], security: superAdminSecurity,
      summary: 'List sub-admins',
      description: `${superOnly} Supports AdminManagement search over name, id, and personal email. pageSize defaults to 10 until the frontend confirms a grid limit.`,
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'role', in: 'query', description: 'Comma-separated or repeated role filters.', schema: { type: 'array', items: { type: 'string', enum: ['Admin', 'Operation Manager'] } }, style: 'form', explode: true },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } }
      ],
      responses: { '200': envelope({ type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/SubAdmin' } }, page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' } } }), '403': { $ref: '#/components/responses/ForbiddenError' } }
    },
    post: {
      tags: [tag], security: superAdminSecurity,
      summary: 'Create a sub-admin profile without credentials',
      description: `${superOnly} Creates contact/profile fields only; workEmail and password are provisioned separately.`,
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SubAdminCreateRequest' } } } },
      responses: { '201': envelope({ $ref: '#/components/schemas/SubAdmin' }), '403': { $ref: '#/components/responses/ForbiddenError' } }
    }
  },
  '/admin/sub-admin/{id}': {
    get: { tags: [tag], security: superAdminSecurity, summary: 'Get sub-admin detail', description: `${superOnly} Password is deliberately excluded; use /credentials.`, parameters: [idParam], responses: { '200': envelope({ $ref: '#/components/schemas/SubAdmin' }), '404': { $ref: '#/components/responses/NotFound' } } },
    patch: { tags: [tag], security: superAdminSecurity, summary: 'Update sub-admin profile', description: `${superOnly} Changing names does not regenerate workEmail; login identity stays stable until explicitly reprovisioned.`, parameters: [idParam], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SubAdminUpdateRequest' } } } }, responses: { '200': envelope({ $ref: '#/components/schemas/SubAdmin' }), '404': { $ref: '#/components/responses/NotFound' } } },
    delete: { tags: [tag], security: superAdminSecurity, summary: 'Permanently delete a sub-admin', description: `${superOnly} This is a hard delete; confirm audit/compliance expectations for permanent removals.`, parameters: [idParam], responses: { '204': { description: 'Deleted' }, '404': { $ref: '#/components/responses/NotFound' } } }
  },
  '/admin/sub-admin/{id}/provision-credentials': { post: { tags: [tag], security: superAdminSecurity, summary: 'Provision sub-admin credentials', description: `${superOnly} If workEmail is omitted, the server generates firstname.lastname@dailyassistuk.com, lowercased, and appends an incrementing number before @ when collisions exist. Overrides must still match the dot-separated name convention and be unique. Passwords are stored in the existing retrievable dashboardPassword field and returned here.`, parameters: [idParam], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/SubAdminProvisionCredentialsRequest' } } } }, responses: { '200': envelope({ $ref: '#/components/schemas/SubAdminCredentialProvisionResponse' }), '404': { $ref: '#/components/responses/NotFound' } } } },
  '/admin/sub-admin/{id}/credentials': { get: { tags: [tag], security: superAdminSecurity, summary: 'Get current sub-admin credentials', description: `${superOnly} Chosen behavior: plaintext password is retrievable because the existing dashboardPassword storage is reversible/plaintext for admin/staff credential-copy UI.`, parameters: [idParam], responses: { '200': envelope({ $ref: '#/components/schemas/SubAdminCredentials' }), '404': { $ref: '#/components/responses/NotFound' } } } },
  '/admin/sub-admin/{id}/reset-password': { post: { tags: [tag], security: superAdminSecurity, summary: 'Reset only the sub-admin password', description: `${superOnly} Leaves workEmail untouched and returns plaintext once reset.`, parameters: [idParam], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/SubAdminResetPasswordRequest' } } } }, responses: { '200': envelope({ $ref: '#/components/schemas/SubAdminPasswordResetResponse' }), '409': { description: 'No workEmail provisioned yet' } } } }
};

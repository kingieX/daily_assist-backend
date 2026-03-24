import type { OpenAPIV3 } from 'openapi-types';

type SecuritySchemesMap = NonNullable<OpenAPIV3.ComponentsObject['securitySchemes']>;

export const securitySchemes: SecuritySchemesMap = {
  BearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
      'JWT access token. Obtain from `POST /auth/admin/login` or `POST /auth/staff/login`. ' +
      'Paste the `accessToken` value here (without the "Bearer " prefix — Swagger adds it automatically).'
  }
};

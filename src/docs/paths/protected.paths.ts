import type { OpenAPIV3 } from 'openapi-types';

export const protectedPaths: OpenAPIV3.PathsObject = {
  '/protected': {
    get: {
      tags: ['Test'],
      summary: 'Protected route smoke test',
      description:
        'Verifies that the authentication middleware is functioning correctly. ' +
        'Returns the caller\'s decoded token identity. ' +
        'This route exists purely for Phase 1 testing and will be removed in later phases.',
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Authentication confirmed — token is valid',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/TokenPayloadUser' }
                        }
                      }
                    }
                  }
                ]
              },
              example: {
                success: true,
                message: 'Protected route accessed successfully',
                data: {
                  user: {
                    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    email: 'admin@dailyassist.local',
                    role: 'ADMIN'
                  }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' }
      }
    }
  }
};

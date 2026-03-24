import type { OpenAPIV3 } from 'openapi-types';

export const healthPaths: OpenAPIV3.PathsObject = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Returns server health status and current uptime. No authentication required.',
      responses: {
        '200': {
          description: 'Server is healthy and accepting requests',
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
                          timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2026-03-23T22:00:00.000Z'
                          },
                          uptimeSeconds: {
                            type: 'number',
                            example: 3600
                          }
                        }
                      }
                    }
                  }
                ]
              },
              example: {
                success: true,
                message: 'DailyAssist API is healthy',
                data: {
                  timestamp: '2026-03-23T22:00:00.000Z',
                  uptimeSeconds: 3600
                }
              }
            }
          }
        }
      }
    }
  }
};

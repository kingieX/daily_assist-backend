import type { OpenAPIV3 } from 'openapi-types';

type ResponsesMap = NonNullable<OpenAPIV3.ComponentsObject['responses']>;

const errorContent = (example: Record<string, unknown>): OpenAPIV3.MediaTypeObject => ({
  schema: { $ref: '#/components/schemas/ErrorResponse' },
  example
});

export const responses: ResponsesMap = {
  ValidationError: {
    description: 'Request validation failed (invalid or missing fields)',
    content: {
      'application/json': errorContent({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: [
          { path: 'limit', message: 'Too big: expected number to be <=100', code: 'too_big' }
        ]
      })
    }
  },

  UnauthorizedError: {
    description: 'Missing, invalid, or expired access token',
    content: {
      'application/json': errorContent({
        success: false,
        message: 'Invalid or expired access token',
        code: 'UNAUTHORIZED'
      })
    }
  },

  ForbiddenError: {
    description: 'Authenticated but role does not permit this action',
    content: {
      'application/json': errorContent({
        success: false,
        message: 'Forbidden: insufficient permissions'
      })
    }
  },

  TooManyRequests: {
    description: 'Rate limit exceeded',
    content: {
      'application/json': errorContent({
        success: false,
        message: 'Too many authentication requests. Please try again later.'
      })
    }
  },

  NotFound: {
    description: 'The requested route does not exist',
    content: {
      'application/json': errorContent({
        success: false,
        message: 'Route not found'
      })
    }
  },

  InternalError: {
    description: 'Unexpected server error',
    content: {
      'application/json': errorContent({
        success: false,
        message: 'Internal server error'
      })
    }
  }
};

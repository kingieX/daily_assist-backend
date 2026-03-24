import type { OpenAPIV3 } from 'openapi-types';

/** Reusable 200 login response block */
const loginSuccessResponse: OpenAPIV3.ResponseObject = {
  description: 'Login successful',
  headers: {
    'Set-Cookie': {
      description:
        'httpOnly refresh token cookie (`refreshToken=<jwt>; Path=/api/v1/auth; HttpOnly; SameSite=Lax`). ' +
        'Automatically sent on subsequent requests to `/auth/refresh` and `/auth/logout`.',
      schema: { type: 'string' }
    }
  },
  content: {
    'application/json': {
      schema: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/TokenSession' }
            }
          }
        ]
      }
    }
  }
};

export const authPaths: OpenAPIV3.PathsObject = {
  '/auth/admin/login': {
    post: {
      tags: ['Auth'],
      summary: 'Admin login',
      description:
        'Authenticates a user with `ADMIN` or `SUPER_ADMIN` role. ' +
        'Returns an access token in the response body and sets a rotating refresh token as an httpOnly cookie.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
            example: {
              email: 'admin@dailyassist.local',
              password: 'Admin@12345'
            }
          }
        }
      },
      responses: {
        '200': loginSuccessResponse,
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/auth/staff/login': {
    post: {
      tags: ['Auth'],
      summary: 'Staff login',
      description:
        'Authenticates a user with the `STAFF` role. ' +
        'Admin accounts are rejected here — use `/auth/admin/login` instead.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
            example: {
              email: 'staff@dailyassist.local',
              password: 'Staff@12345'
            }
          }
        }
      },
      responses: {
        '200': loginSuccessResponse,
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description:
        'Issues a new access + refresh token pair using a valid, non-revoked refresh token. ' +
        'The previous refresh token is immediately revoked (rotation strategy). ' +
        'The refresh token can be sent in the request body **or** via the httpOnly cookie set on login.',
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RefreshRequest' },
            example: { refreshToken: '<your_refresh_token>' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Token refreshed — new token pair issued',
          headers: {
            'Set-Cookie': {
              description: 'Updated httpOnly refresh token cookie',
              schema: { type: 'string' }
            }
          },
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/TokenSession' }
                    }
                  }
                ]
              },
              example: {
                success: true,
                message: 'Token refreshed successfully',
                data: {
                  accessToken: '<new_access_token>',
                  refreshToken: '<new_refresh_token>',
                  user: {
                    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    email: 'admin@dailyassist.local',
                    role: 'ADMIN',
                    status: 'ACTIVE'
                  }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout',
      description:
        'Revokes the provided refresh token and clears the `refreshToken` cookie. ' +
        'The access token expires naturally (15 min) — discard it client-side. ' +
        'Token can be provided in the request body or via cookie.',
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RefreshRequest' },
            example: { refreshToken: '<your_refresh_token>' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Logout successful — refresh token revoked',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: { success: true, message: 'Logout successful' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' }
      }
    }
  },

  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get current user',
      description:
        'Returns the authenticated user identity decoded from the JWT access token. ' +
        'Useful for bootstrapping client-side sessions after page load.',
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Current authenticated user identity',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/TokenPayloadUser' }
                    }
                  }
                ]
              },
              example: {
                success: true,
                message: 'Current user fetched',
                data: {
                  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                  email: 'admin@dailyassist.local',
                  role: 'ADMIN'
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' }
      }
    }
  },

  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Request password reset',
      description:
        'Sends a password reset link to the provided email. ' +
        'The response is always `200` regardless of whether the email exists — this prevents account enumeration. ' +
        'In development (no email server configured), the reset URL is logged to the server console.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ForgotPasswordRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Request received — reset link sent if the email is registered',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: {
                success: true,
                message: 'If that email is registered and active, a password reset link has been sent.'
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password',
      description:
        'Resets the user\'s password using the token from the reset email link. ' +
        'Token is valid for **1 hour** and can only be used once. ' +
        'All active refresh tokens for the user are revoked on success.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResetPasswordRequest' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Password reset successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: {
                success: true,
                message: 'Password reset successful. Please log in with your new password.'
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/TooManyRequests' }
      }
    }
  },

  '/auth/admin-check': {
    get: {
      tags: ['Auth'],
      summary: 'Admin RBAC check',
      description:
        'Test / verification endpoint. Returns `200` only for `ADMIN` or `SUPER_ADMIN` roles. ' +
        'Returns `403` for `STAFF`. Useful for verifying RBAC is working correctly.',
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'RBAC check passed — caller has admin-level role',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' },
              example: { success: true, message: 'Admin RBAC check passed' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  }
};

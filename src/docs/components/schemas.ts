import type { OpenAPIV3 } from 'openapi-types';

type SchemasMap = NonNullable<OpenAPIV3.ComponentsObject['schemas']>;

export const schemas: SchemasMap = {
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'admin@dailyassist.local'
      },
      password: {
        type: 'string',
        minLength: 8,
        example: 'Admin@12345'
      }
    }
  },

  RefreshRequest: {
    type: 'object',
    properties: {
      refreshToken: {
        type: 'string',
        description:
          'Refresh token JWT. Can alternatively be delivered via the httpOnly `refreshToken` cookie set on login.'
      }
    }
  },

  AuthUser: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'admin@dailyassist.local'
      },
      role: {
        type: 'string',
        enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
        example: 'ADMIN'
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
        example: 'ACTIVE'
      }
    }
  },

  TokenPayloadUser: {
    type: 'object',
    description: 'Minimal user identity decoded from the JWT access token.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      role: {
        type: 'string',
        enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF']
      }
    }
  },

  TokenSession: {
    type: 'object',
    properties: {
      accessToken: {
        type: 'string',
        description: 'Short-lived JWT access token (15 min). Include in Authorization: Bearer <token> header.'
      },
      refreshToken: {
        type: 'string',
        description:
          'Long-lived JWT refresh token (7 days). Also set as httpOnly cookie. Use /auth/refresh to rotate.'
      },
      user: { $ref: '#/components/schemas/AuthUser' }
    }
  },

  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Operation successful' },
      data: {
        description: 'Response payload — structure varies by endpoint.'
      }
    }
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'A description of what went wrong' },
      code: {
        type: 'string',
        example: 'VALIDATION_ERROR',
        description: 'Machine-readable error code. Present on specific error types.'
      },
      errors: {
        description: 'Detailed error info (e.g. Zod validation issues). Present on validation failures.'
      }
    }
  },

  // ── Phase 2: Auth ─────────────────────────────────────────────────────────────

  ForgotPasswordRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'admin@dailyassist.local' }
    }
  },

  ResetPasswordRequest: {
    type: 'object',
    required: ['token', 'newPassword'],
    properties: {
      token: { type: 'string', description: 'Raw reset token received via email link' },
      newPassword: {
        type: 'string',
        minLength: 8,
        description: 'Min 8 chars, must include uppercase letter and number',
        example: 'NewPass1'
      }
    }
  },

  // ── Phase 2: Catalog ─────────────────────────────────────────────────────────

  ServiceSummary: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Personal Care' },
      slug: { type: 'string', example: 'personal-care' },
      category: { type: 'string', example: 'Care' },
      description: { type: 'string' },
      isAdditional: { type: 'boolean', example: false }
    }
  },

  Package: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Standard Care' },
      slug: { type: 'string', example: 'standard' },
      description: { type: 'string' },
      priceMin: { type: 'number', example: 90 },
      priceMax: { type: 'number', example: 130 },
      displayOrder: { type: 'integer', example: 2 },
      packageServices: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            service: { $ref: '#/components/schemas/ServiceSummary' }
          }
        }
      }
    }
  },

  // ── Phase 2: Booking ─────────────────────────────────────────────────────────

  CreateBookingRequest: {
    type: 'object',
    required: ['firstName', 'lastName', 'phone', 'agreeToTerms', 'consentToDailyassist'],
    properties: {
      firstName: { type: 'string', example: 'Jane' },
      lastName: { type: 'string', example: 'Doe' },
      email: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
      phone: { type: 'string', example: '+1 555 000 1234' },
      address: { type: 'string', example: '42 Maple Street' },
      city: { type: 'string', example: 'Lagos' },
      zipcode: { type: 'string', example: '100001' },
      packageId: { type: 'string', format: 'uuid', description: 'ID of the selected service package (optional)' },
      preferredDate: { type: 'string', example: '2026-04-15', description: 'ISO date string' },
      preferredTime: { type: 'string', example: '09:00' },
      startDate: { type: 'string', example: '2026-04-20', description: 'Expected service start date' },
      specialMessage: { type: 'string', example: 'Client uses a walker and needs ground floor access.' },
      emergencyContactName: { type: 'string', example: 'Michael Doe' },
      emergencyContactPhone: { type: 'string', example: '+1 555 999 8888' },
      emergencyContactRelationship: { type: 'string', example: 'Son' },
      selectedServiceIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        description: 'IDs of standard services included in the chosen package'
      },
      additionalServiceIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        description: 'IDs of optional add-on services'
      },
      agreeToTerms: { type: 'boolean', enum: [true], description: 'Must be true' },
      consentToDailyassist: { type: 'boolean', enum: [true], description: 'Must be true' }
    }
  },

  BookingConfirmation: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      status: { type: 'string', enum: ['REQUESTED'], example: 'REQUESTED' },
      clientId: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },

  // ── Phase 2: Worker Application ───────────────────────────────────────────────

  WorkerApplicationRequest: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'phone', 'cv'],
    properties: {
      firstName: { type: 'string', example: 'Alice' },
      lastName: { type: 'string', example: 'Smith' },
      email: { type: 'string', format: 'email', example: 'alice.smith@example.com' },
      phone: { type: 'string', example: '+1 555 123 4567' },
      cv: {
        type: 'string',
        format: 'binary',
        description: 'Upload CV file (PDF, DOC, or DOCX), max size 5MB.'
      }
    }
  },

  WorkerApplicationConfirmation: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      status: { type: 'string', enum: ['PENDING'], example: 'PENDING' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  }
};

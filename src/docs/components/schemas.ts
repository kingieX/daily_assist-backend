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

  // ── Phase 2: Consultation + Public Booking ─────────────────────────────────────

  ConsultationRequest: {
    type: 'object',
    required: ['fullName', 'email', 'phoneNumber', 'subject', 'message'],
    properties: {
      fullName: { type: 'string', example: 'Jane Doe' },
      email: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
      phoneNumber: { type: 'string', example: '+1 555 000 1234' },
      subject: { type: 'string', example: 'Help needed for elderly parent' },
      message: {
        type: 'string',
        example: 'I would like to discuss home support options and next available dates.'
      }
    }
  },

  ConsultationConfirmation: {
    type: 'object',
    properties: {
      submittedAt: { type: 'string', format: 'date-time' }
    }
  },

  PublicBookingRequest: {
    type: "object",
    required: [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "address",
      "city",
      "zipcode",
      "packageId",
      "preferredDays",
      "preferredTime",
      "startDate",
      "agreeToTerms",
      "consentToDailyassist"
    ],
    properties: {
      firstName: { type: "string", example: "Jane" },
      lastName: { type: "string", example: "Doe" },
      email: { type: "string", format: "email", example: "jane.doe@example.com" },
      phoneNumber: { type: "string", example: "+44 1268 904 508" },
      address: { type: "string", example: "123 Church Street" },
      city: { type: "string", example: "Canvey Island" },
      zipcode: { type: "string", example: "SS8 0XY" },
      packageId: { type: "string", format: "uuid" },
      preferredDays: {
        type: "array",
        items: { type: "string", enum: ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"] }
      },
      preferredTime: { type: "string", example: "Morning" },
      startDate: { type: "string", format: "date-time" },
      specialMessage: { type: "string" },
      selectedServiceIds: { type: "array", items: { type: "string", format: "uuid" } },
      additionalServiceIds: { type: "array", items: { type: "string", format: "uuid" } },
      emergencyContactName: { type: "string" },
      emergencyContactPhone: { type: "string" },
      emergencyContactRelationship: { type: "string" },
      agreeToTerms: { type: "boolean", enum: [true] },
      consentToDailyassist: { type: "boolean", enum: [true] }
    }
  },

  PublicBookingConfirmation: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["REQUESTED","ASSIGNED","IN_PROGRESS","COMPLETED","CANCELLED"] },
      createdAt: { type: "string", format: "date-time" }
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

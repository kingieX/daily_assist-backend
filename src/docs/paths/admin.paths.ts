import type { OpenAPIV3 } from 'openapi-types';

const adminSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const idParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

export const adminPaths: OpenAPIV3.PathsObject = {
  '/admin/bookings': {
    get: {
      tags: ['Admin — Bookings'],
      summary: 'List bookings',
      description: 'Returns bookings for admin operations. Supports optional filtering by status/client/staff.',
      security: adminSecurity,
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
          }
        },
        {
          name: 'clientId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'assignedStaffId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        '200': {
          description: 'Bookings retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/bookings/{id}': {
    get: {
      tags: ['Admin — Bookings'],
      summary: 'Get booking by ID',
      security: adminSecurity,
      parameters: [idParam],
      responses: {
        '200': {
          description: 'Booking retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/bookings/{id}/assign': {
    post: {
      tags: ['Admin — Bookings'],
      summary: 'Assign booking to staff',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['staffId'],
              properties: {
                staffId: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Booking assigned',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/bookings/{id}/cancel': {
    post: {
      tags: ['Admin — Bookings'],
      summary: 'Cancel booking',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: { type: 'string', minLength: 3, maxLength: 500 }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Booking cancelled',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/clients': {
    get: {
      tags: ['Admin — Clients'],
      summary: 'List clients',
      security: adminSecurity,
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE']
          }
        }
      ],
      responses: {
        '200': {
          description: 'Clients retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    },
    post: {
      tags: ['Admin — Clients'],
      summary: 'Create client',
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['firstName', 'lastName', 'phone'],
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                zipcode: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['ACTIVE', 'INACTIVE']
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Client created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/clients/{id}': {
    get: {
      tags: ['Admin — Clients'],
      summary: 'Get client by ID',
      security: adminSecurity,
      parameters: [idParam],
      responses: {
        '200': {
          description: 'Client retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    patch: {
      tags: ['Admin — Clients'],
      summary: 'Update client',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                zipcode: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['ACTIVE', 'INACTIVE']
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Client updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    delete: {
      tags: ['Admin — Clients'],
      summary: 'Delete client',
      security: adminSecurity,
      parameters: [idParam],
      responses: {
        '200': {
          description: 'Client deleted',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': {
          description: 'Client has related bookings and cannot be deleted',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/admin/staff': {
    get: {
      tags: ['Admin — Staff'],
      summary: 'List staff',
      security: adminSecurity,
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED']
          }
        }
      ],
      responses: {
        '200': {
          description: 'Staff list retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    },
    post: {
      tags: ['Admin — Staff'],
      summary: 'Create staff account',
      description: 'Creates a new STAFF user and linked staff profile. Admin-only.',
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password', 'firstName', 'lastName', 'phone'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                zipcode: { type: 'string' },
                emergencyContactName: { type: 'string' },
                emergencyContactPhone: { type: 'string' },
                emergencyContactRelationship: { type: 'string' },
                photoUrl: { type: 'string', format: 'uri' },
                summary: { type: 'string' },
                skills: { type: 'string' },
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Staff created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '409': {
          description: 'Email already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/admin/staff/{id}': {
    get: {
      tags: ['Admin — Staff'],
      summary: 'Get staff by ID',
      security: adminSecurity,
      parameters: [idParam],
      responses: {
        '200': {
          description: 'Staff retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    patch: {
      tags: ['Admin — Staff'],
      summary: 'Update staff',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                zipcode: { type: 'string' },
                emergencyContactName: { type: 'string' },
                emergencyContactPhone: { type: 'string' },
                emergencyContactRelationship: { type: 'string' },
                photoUrl: { type: 'string', format: 'uri' },
                summary: { type: 'string' },
                skills: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Staff updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    delete: {
      tags: ['Admin — Staff'],
      summary: 'Deactivate staff',
      description: 'Soft delete behavior. Marks staff user as INACTIVE and revokes active refresh tokens.',
      security: adminSecurity,
      parameters: [idParam],
      responses: {
        '200': {
          description: 'Staff deactivated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/recruitment/applications': {
    get: {
      tags: ['Admin — Recruitment'],
      summary: 'List worker applications',
      security: adminSecurity,
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: [
              'PENDING',
              'SHORTLISTED',
              'INTERVIEWED',
              'APPROVED',
              'REJECTED',
              'CONVERTED_TO_STAFF'
            ]
          }
        }
      ],
      responses: {
        '200': {
          description: 'Applications retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/recruitment/applications/{id}': {
    get: {
      tags: ['Admin — Recruitment'],
      summary: 'Get worker application by ID',
      security: adminSecurity,
      parameters: [idParam],
      responses: {
        '200': {
          description: 'Application retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/recruitment/applications/{id}/status': {
    patch: {
      tags: ['Admin — Recruitment'],
      summary: 'Update worker application status',
      description:
        'Updates recruitment review state. Use convert-to-staff endpoint for conversion instead of setting CONVERTED_TO_STAFF directly.',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['PENDING', 'SHORTLISTED', 'INTERVIEWED', 'APPROVED', 'REJECTED']
                },
                reviewNotes: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Application status updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/recruitment/applications/{id}/convert-to-staff': {
    post: {
      tags: ['Admin — Recruitment'],
      summary: 'Convert approved applicant to staff',
      description:
        'Creates a STAFF user and profile from an APPROVED worker application, then marks the application as CONVERTED_TO_STAFF.',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['password'],
              properties: {
                password: { type: 'string', minLength: 8 }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Applicant converted to staff',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': {
          description: 'Email conflict with existing user account',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  }
};

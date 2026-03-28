import type { OpenAPIV3 } from 'openapi-types';

const adminSecurity: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const idParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

const paginationParameters: OpenAPIV3.ParameterObject[] = [
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 }
  },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
  }
];

export const adminPaths: OpenAPIV3.PathsObject = {
  '/admin/dashboard/summary': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get dashboard summary',
      security: adminSecurity,
      responses: {
        '200': { description: 'Dashboard summary retrieved' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/dashboard/charts': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get dashboard chart aggregates',
      security: adminSecurity,
      responses: {
        '200': { description: 'Dashboard charts retrieved' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/dashboard/alerts': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get dashboard operational alerts',
      security: adminSecurity,
      responses: {
        '200': { description: 'Dashboard alerts retrieved' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/bookings': {
    get: {
      tags: ['Admin — Bookings'],
      summary: 'List bookings',
      description: 'Returns paginated bookings with stable sorting and optional filters.',
      security: adminSecurity,
      parameters: [
        ...paginationParameters,
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
          }
        },
        { name: 'clientId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'assignedStaffId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        {
          name: 'sortBy',
          in: 'query',
          schema: { type: 'string', enum: ['createdAt', 'preferredDate', 'updatedAt'], default: 'createdAt' }
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      ],
      responses: {
        '200': { description: 'Bookings retrieved' },
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
        '200': { description: 'Booking retrieved' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    },
    patch: {
      tags: ['Admin — Bookings'],
      summary: 'Update mutable booking fields',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                preferredDate: { type: 'string', format: 'date-time' },
                preferredTime: { type: 'string' },
                startDate: { type: 'string', format: 'date-time' },
                specialMessage: { type: 'string' },
                emergencyContactName: { type: 'string' },
                emergencyContactPhone: { type: 'string' },
                emergencyContactRelationship: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        '200': { description: 'Booking updated' },
        '400': { $ref: '#/components/responses/ValidationError' },
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
        '200': { description: 'Booking assigned' },
        '400': { $ref: '#/components/responses/ValidationError' },
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
              properties: { reason: { type: 'string', minLength: 3, maxLength: 500 } }
            }
          }
        }
      },
      responses: {
        '200': { description: 'Booking cancelled' },
        '400': { $ref: '#/components/responses/ValidationError' },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/bookings/{id}/complete': {
    post: {
      tags: ['Admin — Bookings'],
      summary: 'Complete booking',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                completionNotes: { type: 'string', maxLength: 1000 }
              }
            }
          }
        }
      },
      responses: {
        '200': { description: 'Booking completed' },
        '400': { $ref: '#/components/responses/ValidationError' },
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
        ...paginationParameters,
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] }
        },
        {
          name: 'sortBy',
          in: 'query',
          schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'firstName'], default: 'createdAt' }
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      ],
      responses: { '200': { description: 'Clients retrieved' } }
    },
    post: {
      tags: ['Admin — Clients'],
      summary: 'Create client',
      security: adminSecurity,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBookingRequest' } } }
      },
      responses: { '201': { description: 'Client created' } }
    }
  },
  '/admin/clients/{id}': {
    get: {
      tags: ['Admin — Clients'],
      summary: 'Get client by ID',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Client retrieved' }, '404': { $ref: '#/components/responses/NotFound' } }
    },
    patch: {
      tags: ['Admin — Clients'],
      summary: 'Update client',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } }
      },
      responses: { '200': { description: 'Client updated' } }
    },
    delete: {
      tags: ['Admin — Clients'],
      summary: 'Delete client',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Client deleted' }, '409': { description: 'Client has related bookings' } }
    }
  },
  '/admin/staff': {
    get: {
      tags: ['Admin — Staff'],
      summary: 'List staff',
      security: adminSecurity,
      parameters: [
        ...paginationParameters,
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] }
        },
        {
          name: 'sortBy',
          in: 'query',
          schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'lastLoginAt', 'email'], default: 'createdAt' }
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      ],
      responses: { '200': { description: 'Staff retrieved' } }
    },
    post: {
      tags: ['Admin — Staff'],
      summary: 'Create staff',
      security: adminSecurity,
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: { '201': { description: 'Staff created' } }
    }
  },
  '/admin/staff/{id}': {
    get: {
      tags: ['Admin — Staff'],
      summary: 'Get staff by ID',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Staff retrieved' } }
    },
    patch: {
      tags: ['Admin — Staff'],
      summary: 'Update staff',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: { '200': { description: 'Staff updated' } }
    },
    delete: {
      tags: ['Admin — Staff'],
      summary: 'Deactivate staff',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Staff deactivated' } }
    }
  },
  '/admin/staff/{id}/reset-password': {
    post: {
      tags: ['Admin — Staff'],
      summary: 'Reset staff password',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['newPassword'],
              properties: { newPassword: { type: 'string', minLength: 8 } }
            }
          }
        }
      },
      responses: { '200': { description: 'Password reset successful' } }
    }
  },
  '/admin/recruitment/applications': {
    get: {
      tags: ['Admin — Recruitment'],
      summary: 'List recruitment applications',
      security: adminSecurity,
      parameters: [
        ...paginationParameters,
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['PENDING', 'SHORTLISTED', 'INTERVIEWED', 'APPROVED', 'REJECTED', 'CONVERTED_TO_STAFF']
          }
        },
        {
          name: 'sortBy',
          in: 'query',
          schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'status'], default: 'createdAt' }
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      ],
      responses: { '200': { description: 'Applications retrieved' } }
    }
  },
  '/admin/recruitment/applications/{id}': {
    get: {
      tags: ['Admin — Recruitment'],
      summary: 'Get application by ID',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Application retrieved' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/recruitment/applications/{id}/status': {
    patch: {
      tags: ['Admin — Recruitment'],
      summary: 'Update application status',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: { '200': { description: 'Status updated' } }
    }
  },
  '/admin/recruitment/applications/{id}/convert-to-staff': {
    post: {
      tags: ['Admin — Recruitment'],
      summary: 'Convert approved application to staff account',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['password'],
              properties: { password: { type: 'string', minLength: 8 } }
            }
          }
        }
      },
      responses: { '201': { description: 'Applicant converted to staff' } }
    }
  }
};

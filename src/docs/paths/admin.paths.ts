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

const clientTitleValues = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const clientSexValues = ['Male', 'Female', 'Prefer not to say'];
const visitStatusValues = ['completed', 'pending', 'cancelled'];

const clientSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['id', 'firstName', 'lastName', 'fullName', 'email', 'phone', 'age', 'sex', 'address', 'joinDate'],
  properties: {
    id: { type: 'string', example: 'CLT-0001' },
    clientId: { type: 'string', format: 'uuid', description: 'Internal client UUID, returned for integrations that need it.' },
    title: { type: 'string', enum: clientTitleValues },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    fullName: { type: 'string' },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string' },
    age: { type: 'integer', minimum: 0, maximum: 130, nullable: true },
    sex: { type: 'string', enum: clientSexValues },
    address: { type: 'string' },
    emergencyContactName: { type: 'string' },
    emergencyContactPhone: { type: 'string' },
    emergencyContactRelationship: { type: 'string' },
    note: { type: 'string' },
    joinDate: { type: 'string', format: 'date', description: 'Parseable date used by the frontend Newest/Oldest sort.' },
    proofOfAddress: { type: 'string', nullable: true },
    documents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['doc'] },
          title: { type: 'string' },
          date: { type: 'string' },
          size: { type: 'string' },
          url: { type: 'string' }
        }
      }
    }
  }
};

const clientFormSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['firstName', 'lastName', 'email', 'phone', 'age', 'sex', 'address'],
  properties: {
    title: { type: 'string', enum: clientTitleValues },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string' },
    age: { type: 'integer', minimum: 0, maximum: 130 },
    sex: { type: 'string', enum: clientSexValues },
    address: { type: 'string' },
    emergencyContactName: { type: 'string' },
    emergencyContactPhone: { type: 'string' },
    emergencyContactRelationship: { type: 'string' },
    note: { type: 'string', maxLength: 2000 },
    proofOfAddress: { type: 'string', format: 'binary' }
  }
};

const visitSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['id', 'clientId', 'clientName', 'staffId', 'staffName', 'date', 'status', 'timeStart', 'timeEnd', 'address'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    clientId: { type: 'string', description: 'Public client ID returned by /admin/clients/{id}.' },
    clientUserId: { type: 'string', format: 'uuid', description: 'Internal client UUID.' },
    clientName: { type: 'string' },
    staffId: { type: 'string', description: 'Public staff ID resolvable via GET /admin/staff/{id}.' },
    staffUserId: { type: 'string', format: 'uuid', description: 'Internal staff user UUID.' },
    staffName: { type: 'string' },
    date: { type: 'string', format: 'date' },
    status: { type: 'string', enum: visitStatusValues },
    timeStart: { type: 'string' },
    timeEnd: { type: 'string' },
    address: { type: 'string' }
  }
};

const staffRoleValues = [
  'Home-Help & Support Assistant',
  'Senior Carer',
  'Support Worker',
  'Community Access Support',
  'Care Assistant'
];
const staffZoneValues = ['Canvey Island', 'Basildon', 'Southend-on-Sea', 'Chelmsford', 'Rayleigh'];
const staffVehicleValues = ['Yes, owns a vehicle', 'No vehicle'];
const staffSexValues = ['Male', 'Female', 'Prefer not to say'];
const staffStatusValues = ['available', 'unavailable'];

const staffSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['id', 'firstName', 'lastName', 'name', 'email', 'phone', 'status', 'role', 'dob', 'sex', 'zone', 'vehicle', 'address'],
  properties: {
    id: { type: 'string', example: 'STF-0001' },
    userId: { type: 'string', format: 'uuid', description: 'Internal user UUID, returned for integrations that need it.' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    name: { type: 'string', description: 'Display name composed from firstName and lastName.' },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string' },
    status: { type: 'string', enum: staffStatusValues },
    photo: { type: 'string', nullable: true, description: 'Uploaded staff photo URL.' },
    role: { type: 'string', enum: staffRoleValues },
    dob: { type: 'string', description: 'Free-text date of birth value supplied by the frontend.' },
    sex: { type: 'string', enum: staffSexValues },
    zone: { type: 'string', enum: staffZoneValues },
    vehicle: { type: 'string', enum: staffVehicleValues },
    address: { type: 'string' },
    documents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['image', 'doc'] },
          title: { type: 'string' },
          date: { type: 'string' },
          size: { type: 'string' },
          url: { type: 'string' }
        }
      }
    }
  }
};

const staffFormSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['firstName', 'lastName', 'email', 'phone', 'role', 'dob', 'sex', 'zone', 'vehicle'],
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string' },
    role: { type: 'string', enum: staffRoleValues },
    dob: { type: 'string' },
    sex: { type: 'string', enum: staffSexValues },
    zone: { type: 'string', enum: staffZoneValues },
    vehicle: { type: 'string', enum: staffVehicleValues },
    address: { type: 'string' },
    status: { type: 'string', enum: staffStatusValues, description: 'Optional; defaults to available on create.' },
    photo: { type: 'string', format: 'binary' },
    cv: { type: 'string', format: 'binary' }
  }
};

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

  '/admin/packages': {
    get: {
      tags: ['Admin — Packages'],
      summary: 'List packages',
      description: 'Returns paginated packages for the admin packages page. Requires an ADMIN or SUPER_ADMIN bearer token.',
      security: adminSecurity,
      parameters: [
        ...paginationParameters,
        { name: 'isActive', in: 'query', schema: { type: 'boolean' }, description: 'Filter active/inactive packages.' },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'displayOrder', 'name'], default: 'displayOrder' } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
      ],
      responses: { '200': { description: 'Packages retrieved' } }
    },
    post: {
      tags: ['Admin — Packages'],
      summary: 'Create package',
      description: 'Creates a package from the admin modal form. The backend generates the slug from the package name.',
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminPackageRequest' },
            example: {
              icon: 'Heart',
              name: 'Welfare Check-In Account',
              price: '£25',
              duration: 'per hour',
              tagline: 'Friendly check-ins and practical support for independent living.',
              features: ['Daily welfare check-in', 'Medication reminders'],
              additionalCharge: 'Transport mileage: 45p/mile'
            }
          }
        }
      },
      responses: { '201': { description: 'Package created' }, '400': { $ref: '#/components/responses/ValidationError' } }
    }
  },
  '/admin/packages/{id}': {
    get: {
      tags: ['Admin — Packages'],
      summary: 'Get package by id',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Package retrieved' }, '404': { $ref: '#/components/responses/NotFound' } }
    },
    patch: {
      tags: ['Admin — Packages'],
      summary: 'Update package',
      description: 'Updates package fields from the edit modal. If `name` changes, the backend regenerates a unique slug.',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminPackageRequest' },
            example: { price: '£30', duration: 'per visit', features: ['Welfare check-in', 'Family update'] }
          }
        }
      },
      responses: { '200': { description: 'Package updated' }, '400': { $ref: '#/components/responses/ValidationError' }, '404': { $ref: '#/components/responses/NotFound' } }
    },
    delete: {
      tags: ['Admin — Packages'],
      summary: 'Delete package',
      description: 'Permanently deletes a package. Use from the delete confirmation modal.',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Package deleted' }, '404': { $ref: '#/components/responses/NotFound' }, '409': { description: 'Package is referenced by existing bookings' } }
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
      description: 'Returns all clients in the frontend-friendly shape. The clients page performs search and sorting client-side.',
      security: adminSecurity,
      responses: {
        '200': {
          description: 'Clients retrieved',
          content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'array', items: clientSchema } } } } }
        }
      }
    },
    post: {
      tags: ['Admin — Clients'],
      summary: 'Create client',
      description: 'Creates a client from multipart/form-data. The server generates the public CLT client ID. The frontend currently submits age, so age is stored directly; there is no DOB field on this endpoint.',
      security: adminSecurity,
      requestBody: { required: true, content: { 'multipart/form-data': { schema: clientFormSchema } } },
      responses: {
        '201': { description: 'Client created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: clientSchema } } } } },
        '400': { description: 'Validation failed. Response includes a top-level message string.' }
      }
    }
  },
  '/admin/clients/{id}': {
    get: {
      tags: ['Admin — Clients'],
      summary: 'Get client by ID',
      description: 'Accepts either the public client code (for example CLT-0001) or the internal client UUID.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      responses: { '200': { description: 'Client retrieved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: clientSchema } } } } }, '404': { $ref: '#/components/responses/NotFound' } }
    },
    patch: {
      tags: ['Admin — Clients'],
      summary: 'Update client',
      description: 'Accepts the same multipart/form-data fields as create, including emergency-contact fields, note, and optional proof-of-address replacement.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      requestBody: { required: true, content: { 'multipart/form-data': { schema: clientFormSchema } } },
      responses: { '200': { description: 'Client updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: clientSchema } } } } } }
    },
    delete: {
      tags: ['Admin — Clients'],
      summary: 'Delete client',
      description: 'Permanently deletes the client after deleting associated bookings and their visit records to avoid orphaned history.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      responses: { '200': { description: 'Client deleted' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/clients/{id}/history': {
    get: {
      tags: ['Admin — Clients'],
      summary: 'List client visit history',
      description: 'Returns visit records for one client using the shared Visit shape. Each row includes staffId so the staff can be resolved via GET /admin/staff/{id}.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      responses: { '200': { description: 'Client history retrieved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'array', items: visitSchema } } } } } } }
    }
  },
  '/admin/staff': {
    get: {
      tags: ['Admin — Staff'],
      summary: 'List staff',
      description: 'Returns all staff in the frontend-friendly shape. The staff management UI performs search and available/unavailable filtering client-side.',
      security: adminSecurity,
      responses: {
        '200': {
          description: 'Staff retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: { type: 'array', items: staffSchema }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    },
    post: {
      tags: ['Admin — Staff'],
      summary: 'Create staff profile',
      description: 'Creates a staff account from multipart/form-data. The server generates the staff code and temporary password; status defaults to available if omitted.',
      security: adminSecurity,
      requestBody: { required: true, content: { 'multipart/form-data': { schema: staffFormSchema } } },
      responses: {
        '201': { description: 'Staff created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: staffSchema } } } } },
        '400': { description: 'Validation failed. Response includes a top-level message string.' },
        '409': { description: 'Email address is already in use. Response includes a top-level message string.' }
      }
    }
  },
  '/admin/staff/{id}': {
    get: {
      tags: ['Admin — Staff'],
      summary: 'Get staff by ID',
      description: 'Accepts either the public staff code (for example STF-0001/DA0010) or the internal user UUID.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      responses: { '200': { description: 'Staff retrieved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: staffSchema } } } } } }
    },
    patch: {
      tags: ['Admin — Staff'],
      summary: 'Update staff',
      description: 'Accepts the same multipart/form-data fields as create. Omitted fields remain unchanged, so the frontend can submit either a full prefilled form or only changed fields.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      requestBody: { required: true, content: { 'multipart/form-data': { schema: staffFormSchema } } },
      responses: { '200': { description: 'Staff updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: staffSchema } } } } } }
    },
    delete: {
      tags: ['Admin — Staff'],
      summary: 'Deactivate staff',
      description: 'Soft-deactivates a staff account. This endpoint is documented because the frontend delete buttons need a backend action.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      responses: { '200': { description: 'Staff deactivated' } }
    }
  },
  '/admin/staff/{id}/visits': {
    get: {
      tags: ['Admin — Staff'],
      summary: 'List staff visit history',
      description: 'Returns the same shared Visit records as client history, filtered by staff instead of client.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      responses: { '200': { description: 'Staff visits retrieved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'array', items: visitSchema } } } } } } }
    }
  },
  '/admin/staff/{id}/provision-credentials': {
    post: {
      tags: ['Admin — Staff'],
      summary: 'Provision staff dashboard credentials',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Staff credentials provisioned' } }
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
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['PENDING', 'SHORTLISTED', 'INTERVIEWED', 'APPROVED', 'REJECTED'] }, reviewNotes: { type: 'string', maxLength: 2000 } } }, example: { status: 'SHORTLISTED', reviewNotes: 'Good availability and experience.' } } } },
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

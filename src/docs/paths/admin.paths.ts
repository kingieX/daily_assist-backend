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
  'Senior Care Worker',
  'Support Worker',
  'Community Support Worker',
  'Community Access Support',
  'Care Assistant',
  'Live-In Carer',
  'Admin'
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

  '/admin/job-posts': {
    get: {
      tags: ['Admin — Job Posts'],
      security: adminSecurity,
      summary: 'List all admin job posts',
      description: 'Returns the full list newest first, with every list field normalized to an array and overview as the canonical description field.',
      responses: {
        200: { description: 'Job posts retrieved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'array', items: { $ref: '#/components/schemas/JobPost' } } } } } } },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        403: { $ref: '#/components/responses/ForbiddenError' }
      }
    },
    post: {
      tags: ['Admin — Job Posts'],
      security: adminSecurity,
      summary: 'Create a job post',
      requestBody: { required: true, content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/JobPostRequest' }, { required: ['title'] }] } } } },
      responses: {
        201: { description: 'Job post created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { $ref: '#/components/schemas/JobPost' } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        403: { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/job-posts/{id}': {
    patch: {
      tags: ['Admin — Job Posts'],
      security: adminSecurity,
      summary: 'Update a job post',
      parameters: [idParam],
      description: 'Array fields replace stored arrays entirely. contractType is deprecated and is never written back.',
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/JobPostRequest' } } } },
      responses: {
        200: { description: 'Job post updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { $ref: '#/components/schemas/JobPost' } } } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        403: { $ref: '#/components/responses/ForbiddenError' },
        404: { $ref: '#/components/responses/NotFound' }
      }
    },
    delete: {
      tags: ['Admin — Job Posts'],
      security: adminSecurity,
      summary: 'Delete a job post permanently',
      parameters: [idParam],
      description: 'Worker applications currently store the applied role as free text, so deleting a job post does not cascade, nullify, or block linked recruitment applications.',
      responses: {
        204: { description: 'Job post deleted; no response body.' },
        401: { $ref: '#/components/responses/UnauthorizedError' },
        403: { $ref: '#/components/responses/ForbiddenError' },
        404: { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/dashboard/summary': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get dashboard summary cards',
      description: 'Dashboard-specific projection over today\'s visit records. Returns visitsToday, staffOnDuty, completed, and pendingOrLate; frontend AdminDashboard should destructure those fields instead of activeClients/activeStaff/assignedBookings/pendingApplications.',
      security: adminSecurity,
      responses: {
        '200': { description: 'Dashboard summary retrieved', content: { 'application/json': { example: { success: true, message: 'Dashboard summary retrieved', data: { visitsToday: 12, staffOnDuty: 4, completed: 6, pendingOrLate: 2 } } } } },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/dashboard/activity': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get booking creation activity chart data',
      description: 'Dashboard-specific projection over booking creation timestamps. Returns week, month, and year arrays in one response. Week covers the last 7 days ending today; note the frontend sample only shows MON-SAT (6 entries), so the frontend team should confirm whether Sunday should be included and keep the bar layout aligned with this 7-entry response. If real booking counts regularly exceed the current 0-220 chart MAX_VALUE, the frontend axis should be made dynamic.',
      security: adminSecurity,
      responses: {
        '200': { description: 'Dashboard activity retrieved', content: { 'application/json': { example: { success: true, message: 'Dashboard activity retrieved', data: { week: [{ label: 'MON', value: 50 }], month: [{ label: 'WEEK 1', value: 100 }], year: [{ label: 'JAN', value: 50 }] } } } } },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/staff/schedule': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get today\'s staff schedule widget roster',
      description: 'Dashboard-specific staff roster projection. A staff member is unavailable when they have any visit assigned today, otherwise available. Frontend StaffSchedule should call this endpoint instead of receiving dashboard visits as staffData.',
      security: adminSecurity,
      responses: {
        '200': { description: 'Staff schedule retrieved', content: { 'application/json': { example: { success: true, message: 'Staff schedule retrieved', data: [{ id: 'uuid', name: 'Sarah Johnson', time: '9:00am - 12:00pm', status: 'unavailable' }] } } } },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/dashboard/alerts': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get dashboard alerts feed',
      description: 'Dashboard-specific flat projection over the shared notifications/alerts table used by admin and staff alert feeds. This endpoint reads generated alert records; visit-status, staff-message, and reminder alerts should be produced by event/scheduled workers so admin and staff feeds stay consistent.',
      security: adminSecurity,
      responses: {
        '200': { description: 'Dashboard alerts retrieved', content: { 'application/json': { example: { success: true, message: 'Dashboard alerts retrieved', data: [{ id: 'uuid', type: 'warning', text: '1 Missed Check-In for Mr Grant', createdAt: '2026-08-02T09:00:00.000Z', read: false }] } } } },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/dashboard/visits-today': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get today\'s visits dashboard table',
      description: 'Narrow dashboard-specific projection over the same visit records exposed by the fuller admin visits endpoints, with widget statuses not-started, in-progress, completed, and late.',
      security: adminSecurity,
      responses: {
        '200': { description: 'Dashboard visits today retrieved', content: { 'application/json': { example: { success: true, message: 'Dashboard visits today retrieved', data: [{ id: 'uuid', client: 'Mrs. Alan', address: '1 Main St', staff: 'Sarah Johnson', time: '9:00am - 10:00am', status: 'not-started' }] } } } },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    }
  },
  '/admin/dashboard/reports-today': {
    get: {
      tags: ['Admin — Dashboard'],
      summary: 'Get today\'s report panel preview',
      description: 'Narrow dashboard-specific projection over the same visit log report records exposed by the fuller admin reports endpoints. Returns compact text/time rows for ReportPanel without coupling the dashboard to report-list pagination.',
      security: adminSecurity,
      parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 3 } }],
      responses: {
        '200': { description: 'Dashboard reports today retrieved', content: { 'application/json': { example: { success: true, message: 'Dashboard reports today retrieved', data: [{ id: 'uuid', text: 'Client requested follow-up.', time: 'Just now' }] } } } },
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
      description: 'Returns bookings for the frontend list. Filtering/searching is client-side; each row includes serviceRequest and an ISO date.',
      security: adminSecurity,
      parameters: [
        ...paginationParameters,
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'contacted', 'assigned', 'completed', 'cancelled']
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
        '200': { description: 'Bookings retrieved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/BookingListItem' } } } } } }] } } } },
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
        '200': { description: 'Booking retrieved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Booking' } } }] } } } },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { description: 'Booking is already assigned' }
      }
    },
    patch: {
      tags: ['Admin — Bookings'],
      summary: 'Update/manage booking',
      description: 'Updates status, staffId, pricingAdjustment, mileageFee, confirmedStartDate, and confirmedTime. When status is assigned, staffId is required and the backend creates a visit that can be queried with GET /admin/visits/{staffId}. When status is cancelled, associated visits are removed and the client notification hook is triggered. Status values completed, contacted, and pending have no visit side effects.',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['pending', 'contacted', 'assigned', 'completed', 'cancelled'] },
                staffId: { type: 'string', format: 'uuid', description: 'Staff.userId from GET /admin/staff; populate the Assign To dropdown from that endpoint, not a static list.' },
                pricingAdjustment: { type: 'number' },
                mileageFee: { type: 'number' },
                confirmedStartDate: { type: 'string', format: 'date' },
                confirmedTime: { type: 'string' },
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
      summary: 'Delete staff',
      description: 'Permanently deletes a staff account and frees its staff code for future reassignment. Related staff-owned operational records are cleaned up or unassigned as needed.',
      security: adminSecurity,
      parameters: [{ ...idParam, schema: { type: 'string' } }],
      responses: { '200': { description: 'Staff deleted' } }
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
  '/admin/staff/{id}/credentials': {
    get: {
      tags: ['Admin — Staff'],
      summary: 'Get staff dashboard credentials',
      description: 'Returns previously provisioned staff dashboard credentials (business email and temporary password) without regenerating them. The business email is the dashboard login alias and does not replace the staff member primary email.',
      security: adminSecurity,
      parameters: [idParam],
      responses: {
        '200': { description: 'Staff credentials retrieved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { id: { type: 'string' }, userId: { type: 'string', format: 'uuid' }, primaryEmail: { type: 'string', format: 'email' }, businessEmail: { type: 'string', format: 'email' }, password: { type: 'string' }, credentialsProvisioned: { type: 'boolean' } } } } } } } },
        '404': { $ref: '#/components/responses/NotFound' }
      }
    }
  },
  '/admin/staff/{id}/provision-credentials': {
    post: {
      tags: ['Admin — Staff'],
      summary: 'Provision staff dashboard credentials',
      description: 'Saves admin-generated staff dashboard credentials. The businessEmail is used as a dashboard login alias and does not replace the staff primary email. If businessEmail or password is omitted, the backend generates it. Credentials are emailed to the primary staff email using Mailtrap SMTP/nodemailer.',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                businessEmail: { type: 'string', format: 'email', description: 'Optional staff dashboard login email. Legacy request bodies may still send email.' },
                email: { type: 'string', format: 'email', deprecated: true, description: 'Deprecated alias for businessEmail.' },
                password: { type: 'string', minLength: 8, description: 'Optional admin-generated staff login password.' }
              }
            },
            example: { businessEmail: 'jane.doe@dailyassistuk.com', password: 'TempPass123' }
          }
        }
      },
      responses: { '200': { description: 'Staff credentials provisioned and emailed' } }
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
      description: 'Returns all worker applications submitted through POST /public/worker-applications, newest first, using the full Application shape so the frontend can open ViewApplicantModal without a second request.',
      security: adminSecurity,
      responses: { '200': { description: 'Applications retrieved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Application' } } } }] } } } } }
    }
  },
  '/admin/recruitment/applications/{id}': {
    get: {
      tags: ['Admin — Recruitment'],
      summary: 'Get application by ID',
      description: 'Returns one full Application object, including cv.url for the View and Download buttons.',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '200': { description: 'Application retrieved', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: { $ref: '#/components/schemas/Application' } } }] } } } }, '404': { $ref: '#/components/responses/NotFound' } }
    },
    delete: {
      tags: ['Admin — Recruitment'],
      summary: 'Delete application',
      description: 'Permanently deletes the application and backend-owned CV file. This does not cascade to any staff record created from this application.',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '204': { description: 'Application deleted' }, '404': { $ref: '#/components/responses/NotFound' } }
    }
  },
  '/admin/recruitment/applications/{id}/status': {
    patch: {
      tags: ['Admin — Recruitment'],
      summary: 'Removed: update application status',
      deprecated: true,
      description: 'Removed because RecruitmentPage.jsx has no status field or status action. Use DELETE for destructive actions or convert-to-staff for staff creation.',
      security: adminSecurity,
      parameters: [idParam],
      responses: { '410': { description: 'Endpoint removed' } }
    }
  },
  '/admin/recruitment/applications/{id}/convert-to-staff': {
    post: {
      tags: ['Admin — Recruitment'],
      summary: 'Convert application to staff account',
      description: 'Creates a normal Staff record using the same staff table/schema as POST /admin/staff. staffId is pre-filled from the application but editable. dob and sex are not pre-filled and are required. If no new cv file is uploaded, the existing application CV is carried over to the staff profile. The canonical staff role enum is the merged staff-management and recruitment role list documented here.',
      security: adminSecurity,
      parameters: [idParam],
      requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['staffId', 'firstName', 'lastName', 'email', 'phone', 'dob', 'sex'], properties: { staffId: { type: 'string', description: 'Editable pre-assigned staff ID.' }, staffRole: { type: 'string', enum: staffRoleValues, description: 'Merged canonical role list; supersedes previous mismatched recruitment/staff lists.' }, firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', format: 'email' }, phone: { type: 'string' }, dob: { type: 'string', description: 'Required; admin must enter because it is not pre-filled.' }, sex: { type: 'string', enum: ['Male', 'Female', 'Prefer not to say'], description: 'Required; admin must select because it is not pre-filled.' }, image: { type: 'string', format: 'binary' }, cv: { type: 'string', format: 'binary', description: 'Optional replacement CV.' } } } } } },
      responses: { '201': { description: 'Applicant converted to staff', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { type: 'object', properties: { data: staffSchema } }] } } } }, '409': { $ref: '#/components/responses/Conflict' } }
    }
  }

};

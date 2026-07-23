import type { OpenAPIV3 } from 'openapi-types';

const secured: OpenAPIV3.SecurityRequirementObject[] = [{ BearerAuth: [] }];

const standardErrors = {
  '400': { $ref: '#/components/responses/ValidationError' },
  '401': { $ref: '#/components/responses/UnauthorizedError' },
  '403': { $ref: '#/components/responses/ForbiddenError' },
  '404': { $ref: '#/components/responses/NotFound' }
} as OpenAPIV3.ResponsesObject;

const jsonEnvelope = (schemaRef: string, exampleData: unknown): OpenAPIV3.ResponseObject => ({
  description: 'Successful response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { $ref: schemaRef }
        }
      },
      example: {
        success: true,
        message: 'Request completed successfully',
        data: exampleData
      }
    }
  }
});

const notificationSettingsExample = [
  {
    key: 'bookingRequest',
    label: 'Booking Request',
    sub: 'Notify me when a new booking request is submitted.',
    enabled: true
  },
  {
    key: 'staffCheckin',
    label: 'Staff Check-in',
    sub: 'Notify me when staff check in for visits.',
    enabled: true
  },
  {
    key: 'staffCheckout',
    label: 'Staff Checkout',
    sub: 'Notify me when staff check out from visits.',
    enabled: false
  },
  {
    key: 'missedCheckin',
    label: 'Missed Check-in',
    sub: 'Notify me when staff miss scheduled check-ins.',
    enabled: true
  },
  {
    key: 'missedCheckout',
    label: 'Missed Checkout',
    sub: 'Notify me when staff miss scheduled checkouts.',
    enabled: true
  }
];

const systemLogExample = {
  items: [
    {
      id: '1',
      time: '2026-07-22T09:45:00.000Z',
      user: 'Admin John',
      action: 'Assigned',
      module: 'Visits',
      affectedItem: 'Visit ID: VST-1023',
      description: 'Sarah Johnson assigned to visit for Mrs. Alan.',
      ipAddress: '192.168.0.45',
      status: 'Success'
    }
  ],
  page: 1,
  pageSize: 10,
  total: 87
};

const logFilterParameters: OpenAPIV3.ParameterObject[] = [
  {
    name: 'user',
    in: 'query',
    schema: { type: 'string', enum: ['Admin', 'Operation Manager', 'Staff', 'System'] },
    description: 'Filter by displayed user category.'
  },
  {
    name: 'action',
    in: 'query',
    schema: {
      type: 'string',
      enum: ['Created', 'Updated', 'Deleted', 'Assigned', 'Approved', 'Triggered', 'Submitted', 'Attempted', 'Sent', 'Cancelled']
    },
    description: 'Filter by frontend action label.'
  },
  {
    name: 'module',
    in: 'query',
    schema: {
      type: 'string',
      enum: ['Clients', 'Staff', 'Visits', 'Bookings', 'Messages', 'Settings', 'Alerts', 'Notification', 'Check-in', 'Visit logs', 'Service']
    },
    description: 'Filter by frontend module label.'
  },
  {
    name: 'dateRange',
    in: 'query',
    schema: { type: 'string', enum: ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range'] },
    description: 'When set to Custom Range, startDate and endDate are required.'
  },
  { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
  { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
  {
    name: 'search',
    in: 'query',
    schema: { type: 'string' },
    description: 'Free-text match against description and action.'
  }
];

const rolesPermissionsExample = {
  admin: [
    { key: 'approveBookings', label: 'Approve Bookings', value: true },
    { key: 'assignVisits', label: 'Assign Visits', value: true },
    { key: 'manageClients', label: 'Manage Clients', value: true },
    { key: 'addOtherAdmin', label: 'Add Other Admin', value: false },
    { key: 'manageStaff', label: 'Manage Staff', value: true },
    { key: 'sendMessage', label: 'Send Message', value: true },
    { key: 'viewReports', label: 'View Reports', value: true }
  ],
  staff: [
    { key: 'approveBookings', label: 'Approve Bookings', value: false },
    { key: 'viewAssignVisits', label: 'View Assign Visits', value: true },
    { key: 'manageClients', label: 'Manage Clients', value: false },
    { key: 'manageStaff', label: 'Manage Staff', value: true },
    { key: 'sendMessage', label: 'Send Message', value: true },
    { key: 'viewReports', label: 'View Reports', value: false }
  ]
};

export const profileSettingsPaths: OpenAPIV3.PathsObject = {
  '/staff/profile': {
    get: {
      tags: ['Staff Profile'],
      summary: 'Get authenticated staff profile',
      security: secured,
      responses: {
        '200': jsonEnvelope('#/components/schemas/StaffProfile', {
          name: 'Sarah Johnson',
          initials: 'SJ',
          role: 'Support Worker',
          email: 'sarah@dailyassist.test',
          gender: 'Female',
          phone: '+441234567890',
          dob: '1992-04-12',
          staffId: 'STF-001',
          zone: 'Basildon',
          accountStatus: 'Active',
          lastLoginAt: '2026-07-22T09:45:00.000Z'
        }),
        ...standardErrors
      }
    }
  },
  '/admin/profile': {
    get: {
      tags: ['Admin Profile'],
      summary: 'Get authenticated admin profile',
      security: secured,
      responses: {
        '200': jsonEnvelope('#/components/schemas/AdminProfile', {
          id: '00000000-0000-0000-0000-000000000000',
          firstName: 'John',
          lastName: 'Admin',
          email: 'john.admin@dailyassist.test',
          role: 'Admin',
          photoUrl: null
        }),
        ...standardErrors
      }
    },
    patch: {
      tags: ['Admin Profile'],
      summary: 'Update authenticated admin profile',
      description: 'Updates firstName, lastName, and/or photo. email and role are rejected with 400.',
      security: secured,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminProfileUpdateRequest' },
            example: { firstName: 'John', lastName: 'Admin' }
          },
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                photo: { type: 'string', format: 'binary' }
              },
              additionalProperties: false
            }
          }
        }
      },
      responses: {
        '200': jsonEnvelope('#/components/schemas/AdminProfile', {
          id: '00000000-0000-0000-0000-000000000000',
          firstName: 'John',
          lastName: 'Admin',
          email: 'john.admin@dailyassist.test',
          role: 'Admin',
          photoUrl: '/uploads/admin/photos/admin-000000000000.jpg'
        }),
        ...standardErrors
      }
    }
  },
  '/admin/account': {
    delete: {
      tags: ['Admin Profile'],
      summary: 'Deactivate authenticated admin account',
      description: 'Sets the account inactive/deactivated and revokes active refresh tokens instead of hard deleting the user.',
      security: secured,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminAccountDeactivateRequest' },
            example: { confirm: true }
          }
        }
      },
      responses: {
        '204': { description: 'Account deactivated; sessions invalidated.' },
        ...standardErrors
      }
    }
  },
  '/admin/notification-settings': {
    get: {
      tags: ['Admin Settings'],
      summary: 'Get admin notification settings',
      security: secured,
      responses: {
        '200': jsonEnvelope('#/components/schemas/NotificationSettingsList', notificationSettingsExample),
        ...standardErrors
      }
    },
    patch: {
      tags: ['Admin Settings'],
      summary: 'Update admin notification settings',
      description: 'All keys are optional; omitted keys keep their current value.',
      security: secured,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/NotificationSettingsUpdateRequest' },
            example: {
              bookingRequest: true,
              staffCheckin: true,
              staffCheckout: false,
              missedCheckin: true,
              missedCheckout: true
            }
          }
        }
      },
      responses: {
        '200': jsonEnvelope('#/components/schemas/NotificationSettingsList', notificationSettingsExample),
        ...standardErrors
      }
    }
  },
  '/admin/system-log': {
    get: {
      tags: ['System Log'],
      summary: 'List system log entries',
      security: secured,
      parameters: [
        ...logFilterParameters,
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
      ],
      responses: {
        '200': jsonEnvelope('#/components/schemas/SystemLogListResponse', systemLogExample),
        ...standardErrors
      }
    }
  },
  '/admin/system-log/export': {
    get: {
      tags: ['System Log'],
      summary: 'Export filtered system log as CSV or PDF',
      description: 'Applies the same filters as /admin/system-log but returns the full filtered result set without pagination.',
      security: secured,
      parameters: [
        ...logFilterParameters,
        { name: 'format', in: 'query', required: true, schema: { type: 'string', enum: ['csv', 'pdf'] } }
      ],
      responses: {
        '200': {
          description: 'System log export file.',
          headers: {
            'Content-Disposition': {
              schema: { type: 'string' },
              description: 'attachment; filename="system_log.csv" or attachment; filename="system_log.pdf"'
            }
          },
          content: {
            'text/csv': { schema: { type: 'string' }, example: 'Time,User,Action,Module,Description,Status\n"2026-07-22T09:45:00.000Z","Admin John","Assigned","Visits","Sarah Johnson assigned to visit for Mrs. Alan.","Success"' },
            'application/pdf': { schema: { type: 'string', format: 'binary' } }
          }
        },
        ...standardErrors
      }
    }
  },
  '/admin/roles-permissions': {
    get: {
      tags: ['Admin Settings'],
      summary: 'Get role permission sets',
      description: 'Super Admin only; no PATCH endpoint is exposed until the frontend defines the edit request shape.',
      security: secured,
      responses: {
        '200': jsonEnvelope('#/components/schemas/RolesPermissionsResponse', {
          admin: rolesPermissionsExample.admin,
          staff: rolesPermissionsExample.staff
        }),
        ...standardErrors
      }
    }
  }
};

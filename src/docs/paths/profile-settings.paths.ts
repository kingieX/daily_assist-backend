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
      id: '018f5f9d-1d70-7b1d-a111-9848d49a0001',
      actor: { id: 'admin-user-id', name: 'Admin John', email: 'admin@example.com', role: 'ADMIN' },
      action: 'ASSIGN',
      module: 'VISITS',
      entityType: 'visit',
      entityId: 'visit-id',
      affectedItem: 'visit-id',
      description: 'Reassigned visit',
      ipAddress: '192.168.0.45',
      userAgent: 'Mozilla/5.0',
      status: 'SUCCESS',
      metadata: { previousStaffId: 'old-staff-id', newStaffId: 'new-staff-id' },
      createdAt: '2026-07-22T09:45:00.000Z'
    }
  ],
  pagination: { page: 1, pageSize: 10, total: 87, totalPages: 9 }
};

const logFilterParameters: OpenAPIV3.ParameterObject[] = [
  { name: 'actorUserId', in: 'query', schema: { type: 'string' }, description: 'Filter by exact actor user id.' },
  { name: 'user', in: 'query', schema: { type: 'string' }, description: 'Search actor name, email, or role.' },
  { name: 'action', in: 'query', schema: { type: 'string', enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'STATUS_CHANGE', 'SETTINGS_UPDATE', 'REPORT_PROCESSING', 'CONFIRM', 'CANCEL', 'ASSIGN', 'ACTIVATE', 'DEACTIVATE'] }, description: 'Filter by backend audit action.' },
  { name: 'module', in: 'query', schema: { type: 'string', example: 'VISITS' }, description: 'Filter by backend module, for example AUTHENTICATION, CLIENTS, STAFF, BOOKINGS, VISITS, SETTINGS.' },
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
  '/admin/change-password': {
    post: {
      tags: ['Admin Settings'],
      summary: 'Change authenticated admin password',
      description: 'Available to both Admin and Super Admin users. Verifies currentPassword, enforces a minimum 8-character newPassword, requires confirmPassword to match, and revokes active refresh-token sessions after success.',
      security: secured,
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminChangePasswordRequest' }, example: { currentPassword: 'OldPass123', newPassword: 'NewPass123', confirmPassword: 'NewPass123' } } } },
      responses: { '200': { description: 'Password changed successfully; no sensitive data is returned.' }, ...standardErrors }
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
        '200': { description: 'Notification settings. Shape varies by authenticated role: regular admins receive enabled booleans; super admins receive email/dashboard channel booleans.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { oneOf: [{ $ref: '#/components/schemas/NotificationSettingsList' }, { $ref: '#/components/schemas/SuperAdminNotificationSettingsList' }] } } } } } },
        ...standardErrors
      }
    },
    patch: {
      tags: ['Admin Settings'],
      summary: 'Update admin notification settings',
      description: 'All keys are optional; omitted keys keep their current value. Regular admins send boolean toggles for the 5 operational items. Super admins may send nested { email, dashboard } channel toggles for the 7-item super-admin set.',
      security: secured,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { oneOf: [{ $ref: '#/components/schemas/NotificationSettingsUpdateRequest' }, { $ref: '#/components/schemas/SuperAdminNotificationSettingsUpdateRequest' }] },
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
        '200': { description: 'Notification settings. Shape varies by authenticated role: regular admins receive enabled booleans; super admins receive email/dashboard channel booleans.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { oneOf: [{ $ref: '#/components/schemas/NotificationSettingsList' }, { $ref: '#/components/schemas/SuperAdminNotificationSettingsList' }] } } } } } },
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
  '/admin/system-log/{id}': {
    get: {
      tags: ['System Log'],
      summary: 'Get a system log entry',
      security: secured,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonEnvelope('#/components/schemas/SystemLogEntry', systemLogExample.items[0]),
        ...standardErrors
      }
    }
  },
  '/admin/system-log/export/csv': {
    get: {
      tags: ['System Log'],
      summary: 'Export filtered system log as CSV',
      description: 'Applies the same filters as /admin/system-log but returns the full filtered result set without pagination.',
      security: secured,
      parameters: logFilterParameters,
      responses: {
        '200': {
          description: 'System log CSV export file.',
          headers: {
            'Content-Disposition': {
              schema: { type: 'string' },
              description: 'attachment; filename="system_log.csv" or attachment; filename="system_log.pdf"'
            }
          },
          content: { 'text/csv': { schema: { type: 'string' }, example: 'Created At,Actor Name,Actor Email,Actor Role,Action,Module,Entity Type,Entity ID,Affected Item,Description,IP Address,Status\n"2026-07-22T09:45:00.000Z","Admin John","admin@example.com","ADMIN","ASSIGN","VISITS","visit","visit-id","visit-id","Reassigned visit","192.168.0.45","SUCCESS"' } }
        },
        ...standardErrors
      }
    }
  },

  '/admin/system-log/export/pdf': {
    get: {
      tags: ['System Log'],
      summary: 'Export filtered system log as PDF',
      description: 'Applies the same filters as /admin/system-log but returns the full filtered result set without pagination.',
      security: secured,
      parameters: logFilterParameters,
      responses: {
        '200': {
          description: 'System log PDF export file.',
          content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } }
        },
        ...standardErrors
      }
    }
  },

  '/admin/my-roles-permissions': {
    get: {
      tags: ['Admin Settings'],
      summary: 'Get current admin role permissions',
      description: 'Admin and Super Admin. Returns the permission set that applies to the authenticated admin user. Sub-admins should use this endpoint to read the permissions assigned by the Super Admin.',
      security: secured,
      responses: {
        '200': jsonEnvelope('#/components/schemas/RolesPermissionsResponse', {
          admin: rolesPermissionsExample.admin
        }),
        ...standardErrors
      }
    }
  },
  '/admin/roles-permissions': {
    get: {
      tags: ['Admin Settings'],
      summary: 'Get role permission sets',
      description: 'Super Admin only. Returns the complete Admin and Staff permission sets.',
      security: secured,
      responses: {
        '200': jsonEnvelope('#/components/schemas/RolesPermissionsResponse', {
          admin: rolesPermissionsExample.admin,
          staff: rolesPermissionsExample.staff
        }),
        ...standardErrors
      }
    },
    patch: {
      tags: ['Admin Settings'],
      summary: 'Update role permission sets',
      description: 'Super Admin only. Top-level admin and staff keys are optional; only provided permission keys are updated. Returns the full updated permission object.',
      security: secured,
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RolesPermissionsUpdateRequest' }, example: { admin: { addOtherAdmin: true }, staff: { manageClients: false } } } } },
      responses: { '200': jsonEnvelope('#/components/schemas/RolesPermissionsResponse', rolesPermissionsExample), ...standardErrors }
    }
  }
};

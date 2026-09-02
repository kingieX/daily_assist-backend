import type { OpenAPIV3 } from 'openapi-types';
import { responses } from './components/responses';
import { schemas } from './components/schemas';
import { securitySchemes } from './components/security';
import { authPaths } from './paths/auth.paths';
import { adminPaths } from './paths/admin.paths';
import { healthPaths } from './paths/health.paths';
import { protectedPaths } from './paths/protected.paths';
import { publicPaths } from './paths/public.paths';
import { visitPaths } from './paths/visits.paths';
import { communicationsPaths } from './paths/communications.paths';
import { operationsPaths } from './paths/operations.paths';
import { profileSettingsPaths } from './paths/profile-settings.paths';
import { subAdminPaths } from './paths/sub-admin.paths';
import { realtimePaths } from './paths/realtime.paths';
import { withEndpointGuides } from './utils';

/**
 * DailyAssist OpenAPI 3.0 specification.
 *
 * Convention for updates (per phase):
 *  - Schemas  → src/docs/components/schemas.ts
 *  - Shared responses → src/docs/components/responses.ts
 *  - New module paths → src/docs/paths/<module>.paths.ts  (create one file per module)
 *  - Register the new paths file in the `paths` spread below
 *
 * Phase coverage:
 *  ✅ Phase 1 — Health, Auth (login/refresh/logout/me/admin-check), Protected test route
 *  ✅ Phase 2 — Auth (forgot/reset password), Public catalog (packages, services), Public intake (booking, worker application)
 *  ✅ Phase 3 — Admin operations (dashboard, bookings, clients, staff, recruitment conversion)
 *  ✅ Phase 4 — Visits admin/staff lifecycle endpoints, event logging, and staff dashboard summary
 *  ✅ Phase 5 — communications routes (messages, announcements, notifications + close-out controls)
 *  🚧 Phase 6 started — admin report endpoints
 */
export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',

  info: {
    title: 'DailyAssist API',
    version: '1.0.0',
    description: [
      '## Overview',
      'REST API for **DailyAssist** — a platform connecting clients (especially elderly people',
      'and families) with domestic assistance workers.',
      '',
      '## Base URL',
      'All endpoints are prefixed with `/api/v1`.',
      '',
      '## Authentication',
      'Protected routes require a JWT Bearer token. Obtain one from the login endpoints below.',
      '',
      '**Flow:**',
      '1. `POST /auth/admin/login` or `POST /auth/staff/login` → receive `accessToken` + `refreshToken`',
      '2. Include `Authorization: Bearer <accessToken>` on protected requests',
      '3. When the access token expires (15 min), call `POST /auth/refresh` to rotate the token pair',
      '4. Call `POST /auth/logout` to revoke the session',
      '',
      '## Roles',
      '| Role | Description |',
      '|------|-------------|',
      '| `SUPER_ADMIN` | Full system access |',
      '| `ADMIN` | Full operational access |',
      '| `STAFF` | Limited to own visits, profile, and messaging |',
      '',
      '## Response Envelope',
      'All responses follow a consistent shape:',
      '- **Success:** `{ success: true, message, data? }`',
      '- **Error:** `{ success: false, message, code?, errors? }`',
      '',
      '## Email Deliverability',
      'SMTP emails sent by the backend include both `text/html` and `text/plain` MIME parts. HTML bodies are sent as complete HTML documents (`<!doctype html><html><head>...</head><body>...</body></html>`) so password reset, staff credential, booking enquiry, and notification emails avoid SpamAssassin `HTML_MIME_NO_HTML_TAG` and `MIME_HTML_ONLY` penalties.',
      '',
      '## Notifications and Dashboard Alerts',
      'Notification records are created by the notification event worker after user notification preferences are evaluated. Admin dashboard alerts are not a separate store; `/admin/dashboard/alerts` projects the authenticated admin notification rows into alert cards. Staff direct messages now produce admin `MESSAGE` notifications, and staff check-in/check-out events produce admin `VISIT` notifications when preferences allow them. In multi-process deployments, the API Socket.IO server and notification worker share `REDIS_URL`: BullMQ uses it for jobs, the API uses it for the Socket.IO Redis adapter, and the worker uses it for the Redis emitter so `notification:*` and `alert:*` WebSocket events reach connected clients.',
      '',
      '## Message Thread Deletion',
      'Thread APIs provide permanent deletion for admins and staff: `DELETE /admin/messages/threads/{id}` and `DELETE /staff/messages/threads/{id}` remove the entire conversation for all participants. The nested `.../messages/{messageId}` endpoints permanently remove one message. These operations cannot be undone.'
    ].join('\n')
  },

  servers: [
    {
      url: '/api/v1',
      description: 'Current server (all environments)'
    }
  ],

  tags: [
    {
      name: 'Health',
      description: 'Server status and uptime monitoring'
    },
    {
      name: 'Auth',
      description: 'Authentication — login, token refresh, logout, and session identity'
    },
    {
      name: 'Test',
      description: 'Temporary Phase 1 verification endpoints'
    },
    {
      name: 'Public — Catalog',
      description: 'Public read-only catalog: packages and services (no auth required)'
    },
    {
      name: 'Public — Intake',
      description: 'Public form submissions: booking requests and worker applications (no auth, rate-limited)'
    },
    {
      name: 'Admin — Dashboard',
      description: 'Admin dashboard widget projections for summary, activity, schedule, alerts, visits, and reports'
    },
    {
      name: 'Admin — Job Posts',
      description: 'Admin job post management for careers/recruitment content'
    },
    {
      name: 'Admin — Packages',
      description: 'Admin package management: create, list, detail, update, and delete'
    },
    {
      name: 'Admin — Bookings',
      description: 'Admin booking operations: list, detail, assign, and cancel'
    },
    {
      name: 'Admin — Clients',
      description: 'Admin client management: create, read, update, delete'
    },
    {
      name: 'Admin — Staff',
      description: 'Admin staff account provisioning and profile management'
    },
    {
      name: 'Admin — Sub-Admin Management',
      description: 'Super-admin-only sub-admin CRUD and credential actions. Frontend note: AddAdminModal currently blocks submission until credentials are generated client-side, but the backend supports creating a sub-admin without credentials and provisioning them separately; the frontend can be simplified to match if desired, though it is not required.'
    },
    {
      name: 'Admin — Recruitment',
      description: 'Recruitment review pipeline and applicant-to-staff conversion'
    },
    {
      name: 'Admin — Visits',
      description: 'Admin visit lifecycle operations: create, edit, reassign, cancel'
    },
    {
      name: 'Staff — Visits',
      description: 'Staff visit lifecycle actions: acknowledge, check-in, check-out, history'
    },
    { name: 'Messages', description: 'Unified admin/staff inbox read models and direct chat operations' },
    { name: 'Notifications', description: 'Admin/staff notification history, read state, deletion, unread counts, preferences, and worker-backed delivery projections' },
    { name: 'Realtime', description: 'JWT-authenticated Socket.IO event contract for chat, notifications, and dashboard alerts.' },
    {
      name: 'Admin — Communications',
      description: 'Admin announcement broadcast operations'
    },
    {
      name: 'Staff — Communications',
      description: 'Staff announcement reads and acknowledgements'
    },
    {
      name: 'Staff Profile', description: 'Authenticated staff profile view'
    },
    {
      name: 'Admin Profile', description: 'Admin self-service profile and account deactivation'
    },
    {
      name: 'Admin Settings', description: 'Admin notification settings and role permission references'
    },
    {
      name: 'System Log', description: 'Admin system log filtering and export'
    },
    {
      name: 'Admin — Reports',
      description: 'Admin report triage over staff check-out visit logs'
    },
  ],

  components: {
    securitySchemes,
    schemas,
    responses
  },

  paths: withEndpointGuides({
    ...healthPaths,
    ...authPaths,
    ...protectedPaths,
    ...publicPaths,
    ...adminPaths,
    ...visitPaths,
    ...communicationsPaths,
    ...operationsPaths,
    ...profileSettingsPaths,
    ...subAdminPaths,
    ...realtimePaths
    // Phase 3+: spread additional path modules here
    // e.g. ...adminBookingPaths, ...adminClientPaths, ...staffPaths
  })
};
